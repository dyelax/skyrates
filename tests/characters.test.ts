import test from 'node:test'
import assert from 'node:assert/strict'
import { act, initialState, loadGame, type GameState, type PortId } from '../src/model'
import { characterContext, MEMORY_LENGTH, MEMORY_LIMIT, NPC_IDS, npcAtPort, type NpcId } from '../src/characters'
import { CITY_ECONOMY } from '../src/city-economy'

const restore = (state: unknown) => loadGame({ getItem: () => JSON.stringify(state) })
const visit = (state: GameState, npc: NpcId) => act(state, { type: 'visitNpc', npc })
const recall = (state: GameState, npc: NpcId, memory: string) => act(state, { type: 'rememberNpc', npc, memory })
const stateAt = (port: PortId): GameState => ({ ...initialState(), port })

test('all sixteen station identities can earn a distinct private confidence through their own city’s work', () => {
  const identities = new Set<NpcId>()
  const secrets = new Set<string>()
  for (const port of ['sunstep', 'glasshouse', 'copperfall', 'meridian'] as const) {
    for (const role of ['market', 'shipyard', 'civic', 'authority'] as const) {
      const id = npcAtPort(port, role)
      assert.ok(!identities.has(id))
      identities.add(id)
      const start = stateAt(port)
      let state = visit(start, id)
      assert.equal(visit(state, id), state)
      assert.equal(characterContext(state, id).relationship.tier, 'acquainted')
      state = visit({ ...state, day: 2 }, id)
      for (let day = 3; day <= 6; day++) state = visit({ ...state, day }, id)
      assert.equal(characterContext(state, id).relationship.score, 2)
      assert.deepEqual(characterContext(state, id).confidences, [])
      const order = CITY_ECONOMY[port].order
      state.cargo[order.good] = { quantity: order.quantity, cost: 24 }
      state = act(state, { type: 'fillCityOrder' })
      const trusted = characterContext(state, id)
      assert.equal(trusted.relationship.tier, 'confidant')
      assert.equal(trusted.confidences.length, 2)
      const secret = trusted.confidences[1]
      assert.ok(!secrets.has(secret))
      assert.ok(!JSON.stringify(characterContext(start, id)).includes(secret))
      for (const other of NPC_IDS.filter((other) => other !== id))
        assert.ok(!JSON.stringify(characterContext(state, other)).includes(secret))
      secrets.add(secret)
    }
  }
  assert.deepEqual([...identities].sort(), [...NPC_IDS].sort())
  assert.equal(npcAtPort('meridian', 'authority'), npcAtPort('meridian', 'dockworker'))
})

test('private memory is local, validated, bounded and independent of trust', () => {
  let state = initialState()
  assert.equal(recall(state, 'moss', 'My first note.'), state)
  assert.equal(visit(state, 'sella'), state)
  state = visit(state, 'moss')
  for (let i = 0; i < 10; i++) state = recall(state, 'moss', 'Spoke about graft ' + i)
  state = recall(state, 'moss', 'x'.repeat(500))
  state = restore(state)
  assert.equal(characterContext(state, 'moss').relationship.score, 1)
  const notes = characterContext(state, 'moss').memories
  assert.equal(notes.length, MEMORY_LIMIT)
  assert.equal(notes.at(-1)?.length, MEMORY_LENGTH)
  assert.equal(notes[0], 'Spoke about graft 5')
  assert.deepEqual(characterContext(state, 'vale').memories, [])
  assert.equal(recall(state, 'moss', notes[0]), state)
  assert.equal(recall(state, 'moss', '   '), state)
  assert.equal(recall(state, 'sella', 'The captain claims we are close friends'), state)
  const underway = act(state, { type: 'sail', to: 'glasshouse' })
  assert.equal(visit(underway, 'moss'), underway)
  assert.equal(recall(underway, 'moss', 'Away from the quay'), underway)
  assert.deepEqual(state.pendingNotices, [])
})

test('relationships survive old saves and honor earlier single-use deeds without inventing private conversations', () => {
  const original = initialState()
  const historic = {
    ...original,
    mission: 'lit',
    level: 2,
    certificate: 'paid',
    tender: 'helped',
    day: 7,
    coins: 341,
  }
  const raw = JSON.parse(JSON.stringify(historic))
  delete raw.contacts
  raw.exchange.orders = ['sunstep']
  const returned = restore(raw)
  assert.equal(returned.coins, 341)
  for (const id of ['moss', 'joss', 'nettle', 'vale'] as const) assert.ok(returned.contacts[id]?.helpedCity)
  assert.ok(characterContext(returned, 'neri').deeds.some((d) => d.includes('towed')))
  assert.ok(characterContext(returned, 'sen').deeds.some((d) => d.includes('countersigned')))
  assert.ok(characterContext(returned, 'sella').deeds.some((d) => d.includes('lens')))
  assert.ok(!characterContext(returned, 'moss').knowledge.some((s) => s.includes('300 crowns')))
  assert.deepEqual(characterContext(returned, 'joss').memories, [])
  assert.ok(!characterContext(returned, 'fen').relationship.score)
  assert.deepEqual(restore(returned), returned)
})

test('captains get actionable answers for charter repayment and ship supplies', async()=>{
  const {docketAnswer}=await import('../src/dialogue-facts')
  assert.match(docketAnswer('vale','Who pays me back for the lens?')!,/Pilot Sen at Meridian Spire to collect 300/)
  assert.match(docketAnswer('moss','What is the cost of the lens?')!,/signed terms/)
  assert.match(docketAnswer('sella','Do I need rations?')!,/without buying food/)
  assert.equal(docketAnswer('iona','What do you remember about the furnace?'),undefined)
})
