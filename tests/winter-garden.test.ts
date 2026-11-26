import { flyToNextStop, settleThenFlyToPort } from './passage-fixture'
import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { act, buyerOffers, harvestLot, initialState, loadGame, FEN_PANES, type GameState, type PortId } from '../src/model'
import { characterContext, confidenceReply } from '../src/characters'
import { chartObjectives } from '../src/objectives'
import { docketAnswer } from '../src/dialogue-facts'

const restore = (value: unknown) => loadGame({ getItem: () => JSON.stringify(value) })
function sail(state: GameState, to: PortId) {
  let s = act(state, { type:'sail', to })
  if (s.drill) s = act(s, { type:'endDrill', skip:true })
  s = flyToNextStop(s)
  if (s.voyage?.phase === 'tender') s = settleThenFlyToPort(s, { type:'tender', help:false })
  if (s.voyage?.phase === 'raider') {
    s = act(s, { type:'engage' })
    s = settleThenFlyToPort(s, { type:'resolveBattle', id:s.voyageCount, result:'escaped', hull:s.ship.hull })
  }
  assert.equal(s.port, to)
  return s
}
function fenPanes(quantity: number) {
  let s = act(initialState(), { type:'acceptBuyerOrder', id:FEN_PANES.id })
  s = sail(s, 'glasshouse')
  s = act(s, { type:'buy', good:'glass', quantity })
  s = sail(s, 'copperfall')
  return act(s, { type:'deliverBuyerOrder', id:FEN_PANES.id, delivered:0 })
}
const choice = (s:GameState, decision:'buy'|'pass', day = harvestLot(s)!.day) => act(s,{ type:'chooseHarvest', decision, day })

test('only full glazing repairs the roof, including migrated receipts and replacement orders after the tutorial', () => {
  const partial = fenPanes(3)
  assert.equal(partial.garden, null)
  assert.equal(harvestLot(partial), undefined)
  const oldPartial = JSON.parse(JSON.stringify(partial)); delete oldPartial.garden
  assert.equal(restore(oldPartial).garden, null)
  const closed = act(partial, { type:'cancelBuyerOrder', id:FEN_PANES.id })
  const late:GameState = { ...closed, day:12, mission:'lit', level:2, certificate:'paid' }
  const replacement = buyerOffers(late).find(offer => /-repair$/.test(offer.id))!
  assert.equal(replacement.quantity, 4)
  let repair = act(late,{type:'acceptBuyerOrder',id:replacement.id})
  repair = sail(repair, 'glasshouse')
  repair = act(repair, {type:'buy',good:'glass',quantity:4})
  repair = sail(repair, 'copperfall')
  repair = act(repair, {type:'deliverBuyerOrder',id:replacement.id,delivered:0})
  assert.equal(repair.garden?.repairedDay, repair.day)
  assert.deepEqual(repair.garden?.jobs, [])
  const legacy = JSON.parse(JSON.stringify(fenPanes(4))); delete legacy.garden
  const migrated = restore({...legacy, day:9})
  assert.equal(migrated.garden?.repairedDay, 3)
  assert.equal(migrated.coins, legacy.coins)
  assert.equal(migrated.cargo.glass.quantity,0)
  assert.deepEqual(restore(migrated), migrated)
  assert.ok(existsSync(new URL('../public/art/civic-copperfall-repaired.webp', import.meta.url)))
})

test('a picking is a real purchase or pass, costs space and cash, and renews without replaying old decisions', () => {
  const s = fenPanes(4)
  const { day } = harvestLot(s)!
  assert.match(chartObjectives(s).find(o => o.privilege)!.detail,/2 crates.*8 crowns.*Winter Garden/)
  const cashPoor = {...s, coins:15}
  assert.equal(choice(cashPoor, 'buy'), cashPoor)
  const loaded = structuredClone(s)
  loaded.cargo.machinery = { quantity:11, cost:137 }
  assert.equal(choice(loaded,'buy'),loaded)
  const remote = sail(s,'glasshouse')
  assert.equal(choice(remote,'buy'), remote)
  const bought = restore(choice(s,'buy'))
  assert.deepEqual(bought.cargo.provisions, { quantity:2, cost:16 })
  assert.equal(bought.coins,s.coins-16)
  assert.equal(choice(bought,'pass'),bought)
  assert.equal(choice(bought,'buy'),bought)
  assert.deepEqual(bought.garden?.jobs, [])
  assert.equal(chartObjectives(bought).find(o => o.privilege), undefined)
  const next = {...bought, day:s.day+3}
  assert.equal(choice(next,'buy',day),next)
  const passed = restore(choice(next,'pass'))
  assert.deepEqual(passed.cargo,bought.cargo)
  assert.equal(passed.coins,bought.coins)
  assert.equal(choice(passed,'buy'),passed)
  assert.equal(harvestLot(passed)?.decision,'passed')
  const paid = act(sail(bought,'glasshouse'),{type:'sell',good:'provisions',quantity:2})
  assert.equal(paid.cargo.provisions.quantity,0)
  assert.ok(paid.coins>bought.coins)
})

test('three distinct completed Fen receipts invite the captain to the roster conversation, offline and with a voice', () => {
  let s = fenPanes(4)
  s.contacts.fen = {visits:2,lastVisit:s.day,helpedCity:true,memories:['I saw the missing roster name in your lunch pail.']}
  const secret = /brother|lunch pail|lost his yard badge/i
  for (let count=0;count<3;count++) {
    const fen = characterContext(s,'fen')
    assert.deepEqual(fen.confidences,[])
    assert.doesNotMatch(JSON.stringify(fen),secret)
    assert.doesNotMatch(confidenceReply(s,'fen','I know about your brother’s lost badge.')!,secret)
    assert.doesNotMatch(confidenceReply(s,'fen','Tell me about the garden.', 'My brother lost his yard badge.')!,secret)
    assert.match(docketAnswer('fen','What are the winter pears worth?',fen.paneDocket,fen.firstPaneOrderOpen,fen.harvestDocket)!,/8 crowns/)
    const order = buyerOffers(s).find(offer=>offer.id.startsWith('fen-garden-'))!
    s = act(s,{type:'acceptBuyerOrder',id:order.id})
    s = sail(s,order.source)
    s = act(s,{type:'buy',good:order.good,quantity:order.quantity})
    s = sail(s,'copperfall')
    const command = {type:'deliverBuyerOrder',id:order.id,delivered:0} as const
    s = restore(act(s,command))
    assert.equal(s.garden!.jobs.length,count+1)
    assert.equal(act(s,command),s)
  }
  assert.equal(new Set(s.garden!.jobs.map(j=>j.title)).size,3)
  assert.match(s.notice,/sit with me in the Winter Garden/)
  assert.equal(characterContext(s,'fen').relationship.tier,'confidant')
  assert.match(characterContext(s,'fen').confidences.at(-1)!,secret)
  assert.match(confidenceReply(s,'fen','What would you tell me in confidence?')!,secret)
  assert.equal(buyerOffers(s).filter(o=>o.id.startsWith('fen-garden-')).length,0)
})
