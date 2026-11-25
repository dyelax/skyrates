import test from 'node:test'
import assert from 'node:assert/strict'
import {
  act, buyerOffers, buyerOrders, deliverableQuantity, FEN_PANES, initialState, loadGame,
  pickupQuantity, priceAt, raiderToll, stampedQuantity, type GameState, type PortId,
} from '../src/model'
import { chartObjectives } from '../src/objectives'
import { characterContext } from '../src/characters'
import { docketAnswer } from '../src/dialogue-facts'

const reload = (s: GameState) => loadGame({ getItem: () => JSON.stringify(s) })
const sign = (s: GameState, id = FEN_PANES.id) => act(s, { type: 'acceptBuyerOrder', id })
const handIn = (s: GameState, id = FEN_PANES.id) =>
  act(s, { type: 'deliverBuyerOrder', id, delivered: buyerOrders(s).find(order => order.id === id)?.delivered ?? 0 })

function cross(s: GameState, port: PortId, tow = false) {
  let state = act(s, { type: 'sail', to: port })
  if (state.drill) state = act(state, { type: 'endDrill', skip: true })
  state = act(state, { type: 'continueVoyage' })
  if (state.voyage?.phase === 'tender') state = act(state, { type: 'tender', help: tow })
  if (state.voyage?.phase === 'raider') {
    state = act(state, { type: 'engage' })
    state = act(state, { type: 'resolveBattle', id: state.voyageCount, result: 'escaped', hull: state.ship.hull })
  }
  assert.equal(state.port, port)
  return state
}

function charter(seed: number, day = 9): GameState {
  const state = initialState()
  state.day = day
  state.mission = 'lit'
  state.certificate = 'paid'
  state.level = 2
  state.coins = 600
  state.buyers.seed = seed
  return state
}

test('Fen signs from the chart, pays four panes at 26 through day four and remembers the delivery', () => {
  let s = initialState()
  assert.deepEqual(buyerOffers(s), [FEN_PANES])
  const fen = characterContext({ ...s, port:'copperfall' }, 'fen')
  assert.match(docketAnswer('fen', 'When are your panes due?', fen.paneDocket, fen.firstPaneOrderOpen)!, /4 solar glass panes.*26 crowns per pane through day 4/)
  s = sign(s)
  assert.equal(sign(s), s)
  s = cross(s, 'glasshouse')
  s = act(s, { type: 'buy', good: 'glass', quantity: 5 })
  assert.equal(handIn(s), s, 'the source port cannot settle the buyer’s ticket')
  s = reload(cross(s, 'copperfall', true))
  assert.equal(s.day, 4)
  assert.equal(deliverableQuantity(s, FEN_PANES.id), 4)
  const initialCoins = s.coins, initialXP = s.xp
  s = handIn(s)
  assert.equal(s.coins, initialCoins + 104)
  assert.equal(s.xp, initialXP + 5)
  assert.equal(s.tradeProfitRemainder, 6)
  assert.equal(s.cargo.glass.quantity, 1)
  assert.match(characterContext(s, 'fen').deeds.join(' '), /four panes/)
  s = reload(s)
  assert.equal(sign(s), s)
  assert.equal(handIn(s), s)
  assert.equal(buyerOrders(s).length, 0)
  assert.equal(buyerOffers(s).length, 0)
  const ordinary = act(s, { type: 'sell', good: 'glass', quantity: 1 })
  assert.equal(ordinary.coins, s.coins + priceAt(s, 'copperfall', 'glass').sell)
})

test('partial delivery, deadline and release keep the precise receipt and allow ordinary sales', () => {
  let s = cross(sign(initialState()), 'glasshouse')
  s = act(s, { type: 'buy', good: 'glass', quantity: 2 })
  s = cross(s, 'copperfall')
  s = reload(handIn(s))
  assert.equal(buyerOrders(s)[0].delivered, 2)
  assert.match(chartObjectives(s).find(job => job.buyerId)?.detail ?? '', /2 solar glass panes still due/)
  assert.equal(act(s, { type:'deliverBuyerOrder', id:FEN_PANES.id, delivered:0 }), s)
  const released = act(s, { type: 'cancelBuyerOrder', id: FEN_PANES.id })
  assert.equal(sign(released), released)
  assert.equal(released.coins, s.coins)
  s = cross(s, 'glasshouse')
  s = act(s, { type: 'buy', good: 'glass', quantity: 2 })
  s = reload(cross(s, 'copperfall'))
  assert.ok(s.day > 4)
  assert.equal(handIn(s), s)
  assert.equal(s.cargo.glass.quantity, 2)
  assert.equal(s.buyers.orders[0].status, 'expired')
  assert.ok(s.log.some(entry => entry.text.includes('Delivered 2 of 4')))
})

test('chartered postings rotate, stay stable on reload and honor accepted prior-cycle terms', () => {
  let s = charter(5)
  const [collect, delivery] = buyerOffers(s)
  assert.deepEqual([collect.kind, delivery.kind], ['collection', 'delivery'])
  assert.deepEqual(buyerOffers(reload(s)), buyerOffers(s))
  assert.notDeepEqual(buyerOffers(charter(6)), buyerOffers(s))
  s = sign(s, collect.id)
  s = cross(s, collect.source)
  assert.notEqual(buyerOffers(s)[0].id, delivery.id)
  assert.equal(act(s, { type:'acceptBuyerOrder', id:delivery.id }), s)
  s = act(s, { type:'buy', good:collect.good, quantity:collect.quantity })
  s = reload(cross(s, collect.destination))
  const before = s.coins
  s = handIn(s, collect.id)
  assert.equal(s.coins - before, collect.rate * collect.quantity)
})

test('stamped deliveries require purchase at the source, survive reload and lose stamps on sale', () => {
  let s = charter(2)
  const delivery = buyerOffers(s).find(offer => offer.kind === 'delivery')!
  s = sign(s, delivery.id)
  if (s.port !== delivery.source) s = cross(s, delivery.source)
  const stock = priceAt(s, delivery.source, delivery.good).buy
  const purchase = { type:'pickupBuyerOrder', id:delivery.id, delivered:0, loaded:0 } as const
  const count = pickupQuantity(s, delivery.id), before = s.coins
  assert.equal(count, delivery.quantity)
  assert.ok(count > 1)
  s = reload(act(s, purchase))
  assert.equal(s.coins, before - count * stock)
  assert.equal(stampedQuantity(s, delivery.good), count)
  assert.equal(act(s, purchase), s)
  s = act(s, { type:'sell', good:delivery.good, quantity:1 })
  assert.equal(stampedQuantity(s, delivery.good), count - 1)
  // An ordinary purchase at the source still has no consignment stamp.
  s = act(s, { type:'buy', good:delivery.good, quantity:1 })
  assert.equal(stampedQuantity(s, delivery.good), count - 1)
  s = cross(s, delivery.destination)
  assert.equal(pickupQuantity(s, delivery.id), 0)
  assert.equal(deliverableQuantity(s, delivery.id), count - 1)
  const previous = s.coins
  s = handIn(s, delivery.id)
  assert.equal(s.coins, previous + (count - 1) * delivery.rate)
  assert.equal(s.cargo[delivery.good].quantity, 1)
  assert.equal(buyerOrders(s).find(order => order.id === delivery.id)?.delivered, count - 1)
})

test('legacy captains keep their game and receive an appropriate noticeboard', () => {
  const s = charter(0, 18)
  const old = JSON.parse(JSON.stringify(s))
  delete old.buyers
  assert.deepEqual(loadGame({ getItem: () => JSON.stringify(old) }), s)
})

test('paying a pirate with a pane leaves Fen one short, while cash or escape preserves the full order', () => {
  let docked = cross(sign(initialState(7)), 'glasshouse')
  docked = act(docked, { type: 'buy', good: 'glass', quantity: 4 })
  // Stage a third-passage hail before the tutorial order expires.
  docked.voyageCount = 2
  docked.tender = 'passed'
  const sailing = act(docked, { type: 'sail', to: 'copperfall' })
  const hailed = reload(act(sailing, { type: 'continueVoyage' }))
  const { crowns, settlement } = raiderToll(hailed)
  const id = hailed.voyageCount
  assert.deepEqual(settlement.cargo, [{ good: 'glass', quantity: 1 }])
  const cash = act(hailed, { type: 'payToll', id, payment: 'crowns' })
  const fight = reload(act(hailed, { type: 'engage' }))
  assert.deepEqual(raiderToll(fight), raiderToll(hailed))
  const escape = act(fight, { type: 'resolveBattle', id, result: 'escaped', hull: fight.ship.hull })
  for (const safe of [cash, escape]) {
    const receipt = reload(handIn(safe))
    assert.equal(receipt.buyers.orders[0].status, 'filled')
    assert.equal(receipt.coins, docked.coins + 104 - (safe === cash ? crowns : 0))
    assert.equal(receipt.xp - docked.xp, 5)
    assert.equal(receipt.tradeProfitRemainder, 6)
  }
  const paidInGlass = reload(act(hailed, { type: 'payToll', id, payment: 'cargo' }))
  const partial = reload(handIn(paidInGlass))
  assert.equal(partial.coins - paidInGlass.coins, 78)
  assert.equal(partial.xp - docked.xp, 4)
  assert.equal(partial.tradeProfitRemainder, 2)
  assert.match(chartObjectives(partial).find(job => job.buyerId)!.detail, /1 solar glass pane still due/)
})
