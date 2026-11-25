import assert from 'node:assert/strict'
import test from 'node:test'
import { act, initialState, loadGame, raiderToll, type GameState } from '../src/model'
import { assessPlaytest } from '../src/playtest-answers'

function legacyChallenge(empty = false): GameState {
  const old = initialState()
  old.voyageCount = 3
  old.voyage = { id: 3, from: 'sunstep', to: 'copperfall', phase: 'raider' }
  old.coins = 26
  old.mission = 'lit'
  old.level = 2
  old.certificate = 'aboard'
  old.freight = { from: 'sunstep', to: 'glasshouse', pay: 18, special: false }
  if (!empty) {
    old.cargo.machinery = { quantity: 2, cost: 38 }
    old.cargo.prisms = { quantity: 3, cost: 76 }
    old.cargo.soundings = { quantity: 1, cost: 50 }
  }
  return loadGame({ getItem: () => JSON.stringify(old) })
}
const restore = (state: GameState) => loadGame({ getItem: () => JSON.stringify(state) })

test('the challenge quotes the most valuable home-port good independently of price paid, season or ability', () => {
  const s = legacyChallenge()
  assert.deepEqual(raiderToll(s), { good: 'prisms', crowns: 25 })
  assert.deepEqual(raiderToll({ ...s, day: 48, ability: 'broker' }), raiderToll(s))
  assert.match(assessPlaytest('What does the raider want?', s, 'voyage').answer, /one crate of prism blanks or 25 crowns/)
  assert.equal(act(s, { type: 'payToll', id: 9, payment: 'cargo' }), s)
  const paid = act(s, { type: 'payToll', id: 3, payment: 'cargo' })
  assert.equal(paid.port, 'copperfall')
  assert.deepEqual(paid.cargo.prisms, { quantity: 2, cost: 51 })
  assert.equal(paid.coins, s.coins)
  assert.deepEqual(paid.freight, s.freight)
  assert.equal(paid.certificate, 'aboard')
  assert.equal(paid.ship.hull, s.ship.hull)
  assert.equal(paid.xp, s.xp)
  const resumed = restore(paid)
  assert.equal(act(resumed, { type: 'payToll', id: 3, payment: 'cargo' }), resumed)
  assert.equal(act(resumed, { type: 'payToll', id: 3, payment: 'crowns' }), resumed)
  const cash = act(s, { type: 'payToll', id: 3, payment: 'crowns' })
  assert.equal(cash.coins, 1)
  assert.deepEqual(cash.cargo, s.cargo)
})

test('a refused demand requires live combat; victory and escape preserve cargo, defeat forfeits only the demanded crate', () => {
  const s = legacyChallenge()
  const battle = restore(act(s, { type: 'engage' }))
  assert.equal(battle.voyage?.phase, 'battle')
  assert.equal(act(s, { type: 'evade' }).voyage?.phase, 'battle')
  assert.equal(act(battle, { type: 'payToll', id: 3, payment: 'crowns' }), battle)
  for (const result of ['escaped', 'won', 'boarded'] as const) {
    const entered = act(battle, { type: 'resolveBattle', id: 3, result, hull: 57 })
    assert.deepEqual(entered.cargo, s.cargo)
    assert.equal(entered.ship.hull, 57)
    assert.equal(entered.port, 'copperfall')
  }
  const lost = act(battle, { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 })
  assert.equal(lost.coins, s.coins)
  assert.deepEqual(lost.cargo.prisms, { quantity: 2, cost: 51 })
  assert.deepEqual(lost.cargo.soundings, s.cargo.soundings)
  assert.equal(lost.certificate, 'aboard')
  assert.deepEqual(lost.freight, s.freight)
  const resumed = restore(lost)
  assert.equal(act(resumed, { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 }), resumed)
})

test('empty ships owe five crowns; every captain can take the helm; losses stop at existing cash', () => {
  const base = legacyChallenge(true)
  assert.deepEqual(raiderToll(base), { good: null, crowns: 5 })
  assert.equal(act(base, { type: 'payToll', id: 3, payment: 'cargo' }), base)
  for (const coins of [0, 2, 5, 80]) {
    const s = { ...base, coins, ship: { ...base.ship, hull: 1 } }
    const paid = act(s, { type: 'payToll', id: 3, payment: 'crowns' })
    if (coins < 5) assert.equal(paid, s)
    else assert.equal(paid.coins, coins - 5)
    const fight = act(s, { type: 'engage' })
    assert.equal(fight.voyage?.phase, 'battle')
    const lost = act(fight, { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 })
    assert.equal(lost.coins, Math.max(0, coins-5))
    assert.equal(lost.port, 'copperfall')
    assert.equal(lost.certificate, 'aboard')
    assert.deepEqual(lost.freight, s.freight)
  }
})
