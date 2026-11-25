import assert from 'node:assert/strict'
import test from 'node:test'
import { act, initialState, loadGame, raiderToll, tollSettlementLabel, type GameState } from '../src/model'
import { assessPlaytest } from '../src/playtest-answers'

function legacyChallenge(coins = 0): GameState {
  const old = initialState()
  old.voyageCount = 3
  old.voyage = { id: 3, from: 'sunstep', to: 'copperfall', phase: 'raider' }
  old.coins = coins
  old.mission = 'lit'
  old.level = 2
  old.certificate = 'aboard'
  old.freight = { from: 'sunstep', to: 'glasshouse', pay: 18, special: false }
  return loadGame({ getItem: () => JSON.stringify(old) })
}
const restore = (state: GameState) => loadGame({ getItem: () => JSON.stringify(state) })
const pay = (s: GameState, payment: 'cargo' | 'crowns') => act(s, { type: 'payToll', id: 3, payment })
const defeat = (s: GameState) => act(restore(act(s, { type: 'engage' })), { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 })

test('cash and appraised trade goods equally affect both tier thresholds and tolls within each band', () => {
  for (const [wealth, tier, percentage, cannons, hull, crew] of [
    [0,'scout',5,1,62,5], [101,'scout',6,1,62,5], [139,'scout',7,1,62,5],
    [140,'cutter',7,2,82,8.3], [319,'cutter',16,2,82,8.3], [320,'corsair',16,4,110,13],
    [321,'corsair',17,4,110,13], [1400,'corsair',70,4,110,13],
  ] as const) {
    const s = legacyChallenge(wealth)
    const cashQuote = raiderToll(s)
    assert.equal(cashQuote.exposedValue, wealth)
    assert.equal(cashQuote.crowns, percentage)
    assert.deepEqual([cashQuote.profile.id, cashQuote.profile.cannons, cashQuote.profile.hull, cashQuote.profile.crew], [tier, cannons, hull, crew])
    if (wealth >= 75) {
      s.coins -= 75
      s.cargo.prisms = { quantity: 3, cost: 6 }
      s.ability = 'broker'
      s.day = 39
      const split = raiderToll(s)
      assert.equal(split.cargoValue, 75)
      assert.equal(split.exposedValue, wealth)
      assert.deepEqual(split.profile, cashQuote.profile)
      assert.equal(split.crowns, cashQuote.crowns)
    }
  }
})

test('return exact change for a single expensive crate, preserving cost basis, mail and papers', () => {
  const s = legacyChallenge()
  s.cargo.prisms = { quantity: 3, cost: 76 }
  const toll = raiderToll(s)
  assert.deepEqual(toll.settlement, { cargo: [{ good: 'prisms', quantity: 1 }], coins: 0, change: 20 })
  assert.match(tollSettlementLabel(toll.settlement), /1 crate of prism blanks.*20 crowns in change/)
  assert.match(assessPlaytest('What does the raider want?', s, 'voyage').answer, /75 crowns.*scout demands 5 crowns/i)
  assert.equal(pay(s, 'crowns'), s)
  assert.equal(act(s, { type: 'payToll', id: 9, payment: 'cargo' }), s)
  const paid = pay(restore(s), 'cargo')
  assert.equal(paid.port, 'copperfall')
  assert.deepEqual(paid.cargo.prisms, { quantity: 2, cost: 51 })
  assert.equal(paid.coins, 20)
  assert.equal(raiderToll(paid).exposedValue, 70)
  assert.deepEqual(paid.freight, s.freight)
  assert.equal(paid.certificate, 'aboard')
  assert.equal(paid.ship.hull, s.ship.hull)
  assert.equal(paid.xp, s.xp)
  const resumed = restore(paid)
  assert.equal(pay(resumed, 'cargo'), resumed)
  assert.equal(pay(resumed, 'crowns'), resumed)
})

test('the lookout lists all high-value goods first, followed by any cash still due', () => {
  const s = legacyChallenge(900)
  s.cargo.provisions = { quantity: 2, cost: 10 }
  s.cargo.prisms = { quantity: 1, cost: 32 }
  // 935 exposed -> 47 due. All 35 crowns of goods plus 12 actual crowns.
  const toll = raiderToll(s)
  assert.equal(toll.crowns, 47)
  assert.deepEqual(toll.settlement, {
    cargo: [{ good: 'prisms', quantity: 1 }, { good: 'provisions', quantity: 2 }], coins: 12, change: 0,
  })
  assert.match(tollSettlementLabel(toll.settlement), /1 crate of prism blanks \+ 2 crates of provisions \+ 12 crowns/)
  const cargo = pay(s, 'cargo'), cash = pay(s, 'crowns'), lost = defeat(s)
  assert.equal(cash.coins, 853)
  assert.deepEqual(cash.cargo, s.cargo)
  assert.equal(cargo.coins, 888)
  assert.deepEqual(cargo.cargo, lost.cargo)
  assert.equal(lost.coins, cargo.coins)
  for (const settled of [cargo,cash,lost]) {
    assert.equal(raiderToll(settled).exposedValue, toll.exposedValue - toll.crowns)
  }
  const resumed = restore(lost)
  assert.equal(act(resumed, { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 }), resumed)
})

test('a fractional toll on a large lot never confiscates the whole cargo or rewards a refusal', () => {
  const s = legacyChallenge()
  s.cargo.soundings = { quantity: 12, cost: 240 }
  const toll = raiderToll(s)
  assert.equal(toll.profile.id, 'cutter')
  assert.equal(toll.exposedValue, 288)
  assert.equal(toll.crowns, 15)
  assert.deepEqual(toll.settlement, { cargo: [{ good: 'soundings', quantity: 1 }], coins: 0, change: 9 })
  const lost = defeat(s)
  assert.deepEqual(lost.cargo.soundings, { quantity: 11, cost: 220 })
  assert.equal(lost.coins, 9)
  assert.equal(raiderToll(lost).exposedValue, 273)
  assert.equal(lost.xp, s.xp)
  assert.deepEqual(lost.freight, s.freight)
  assert.equal(lost.certificate, s.certificate)
})

test('refusal requires live combat; winning or escaping keeps the cargo and pays no toll', () => {
  const s = legacyChallenge(245)
  s.cargo.prisms = { quantity: 3, cost: 76 }
  assert.equal(raiderToll(s).profile.id, 'corsair')
  const battle = restore(act(s, { type: 'engage' }))
  assert.deepEqual(raiderToll(battle), raiderToll(s))
  assert.equal(act(s, { type: 'evade' }).voyage?.phase, 'battle')
  assert.equal(pay(battle, 'cargo'), battle)
  for (const [result, bounty] of [['escaped',0],['won',25],['boarded',40]] as const) {
    const arrived = act(battle, { type: 'resolveBattle', id: 3, result, hull: 57 })
    assert.deepEqual(arrived.cargo, s.cargo)
    assert.equal(arrived.ship.hull, 57)
    assert.equal(arrived.coins, 245 + bounty)
  }
})

test('the smallest empty hold demand is five; losing never exceeds what a poor captain has', () => {
  for (const coins of [0, 1, 4, 5, 80]) {
    const s = legacyChallenge(coins)
    s.ship.hull = 1
    assert.equal(raiderToll(s).crowns,5)
    assert.equal(pay(s, 'cargo'), s)
    const paid = pay(s, 'crowns')
    if (coins < 5) assert.equal(paid, s)
    else assert.equal(paid.coins, coins - 5)
    const owedOnDefeat = Math.min(coins,5)
    assert.deepEqual(raiderToll(s).settlement, {cargo: [], coins: owedOnDefeat, change: 0})
    const lost = defeat(s)
    assert.equal(lost.coins, coins - owedOnDefeat)
    assert.equal(lost.port, 'copperfall')
    assert.equal(lost.certificate, 'aboard')
    assert.deepEqual(lost.freight, s.freight)
  }
})

test('every posted tender conserves appraised wealth, including multiple whole crates and mixed purses', () => {
  const s = legacyChallenge()
  for (const cash of [0, 1, 4, 5, 100, 101, 140, 319, 320, 600, 5_000]) {
    for (const glass of [0, 1, 3, 8]) {
      for (const machinery of [0, 1, 2]) {
        for (const prisms of [0, 1, 2]) {
          s.coins = cash
          s.cargo.glass = { quantity: glass, cost: glass * 9 }
          s.cargo.machinery = { quantity: machinery, cost: machinery * 15 }
          s.cargo.prisms = { quantity: prisms, cost: prisms * 28 }
          const toll = raiderToll(s)
          const paid = toll.settlement.cargo.length ? pay(s, 'cargo') : defeat(s)
          assert.equal(paid.voyage, null)
          assert.ok(paid.coins >= 0)
          assert.equal(raiderToll(paid).exposedValue, Math.max(0, toll.exposedValue - toll.crowns))
        }
      }
    }
  }
})
