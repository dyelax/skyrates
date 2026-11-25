import assert from 'node:assert/strict'
import test from 'node:test'
import { act, appraise, initialState, LEVY_BANDS, loadGame, raiderForecast, raiderToll, rollPirate, tollSettlementLabel, type GameState } from '../src/model'
import { assessPlaytest } from '../src/playtest-answers'

function legacyChallenge(coins = 0, cargo: Partial<GameState['cargo']> = {}): GameState {
  const old = initialState()
  old.voyageCount = 3
  old.voyage = { id: 3, from: 'sunstep', to: 'copperfall', phase: 'raider' }
  old.coins = coins
  old.mission = 'lit'
  old.level = 2
  old.certificate = 'aboard'
  old.freight = { from: 'sunstep', to: 'glasshouse', pay: 18, special: false }
  Object.assign(old.cargo, cargo)
  // The previous release did not save encounter terms or a captain's random seed.
  const { pirateSeed: _seed, ...legacy } = old
  return loadGame({ getItem: () => JSON.stringify(legacy) })
}
function preparedManifest(seed: number, coins: number) {
  const docked = initialState(seed)
  docked.voyageCount = 2
  docked.tender = 'passed'
  docked.coins = coins
  return docked
}

const restore = (state: GameState) => loadGame({ getItem: () => JSON.stringify(state) })
const pay = (s: GameState, payment: 'cargo' | 'crowns') => act(s, { type: 'payToll', id: 3, payment })
const defeat = (s: GameState) => act(restore(act(s, { type: 'engage' })), { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 })

test('an earlier save at the hail keeps its quoted ship and whole-crown demand within the new half-wealth ceiling', () => {
  for (const [wealth, tier, percentage, cannons, hull, crew] of [
    [0,'scout',0,1,62,5], [101,'scout',6,1,62,5], [139,'scout',7,1,62,5],
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
  const s = legacyChallenge(0, { prisms: { quantity: 3, cost: 76 } })
  const toll = raiderToll(s)
  assert.deepEqual(toll.settlement, { cargo: [{ good: 'prisms', quantity: 1 }], coins: 0, change: 20 })
  assert.match(tollSettlementLabel(toll.settlement), /1 crate of prism blanks.*20 crowns in change/)
  assert.match(assessPlaytest('What does the raider want?', s, 'voyage').answer, /75 crowns.*scout demands 5 crowns/i)
  assert.equal(pay(s, 'crowns'), s)
  assert.equal(act(s, { type: 'payToll', id: 9, payment: 'cargo' }), s)
  const paid = pay(restore(s), 'cargo')
  assert.equal(paid.port, 'copperfall')
  assert.equal(paid.cargo.prisms.quantity, 2)
  assert.equal(paid.cargo.prisms.cost, 51)
  assert.equal(paid.coins, 20)
  assert.equal(appraise(paid).exposedValue, 70)
  assert.deepEqual(paid.freight, s.freight)
  assert.equal(paid.certificate, 'aboard')
  assert.equal(paid.ship.hull, s.ship.hull)
  assert.equal(paid.xp, s.xp)
  const resumed = restore(paid)
  assert.equal(pay(resumed, 'cargo'), resumed)
  assert.equal(pay(resumed, 'crowns'), resumed)
})

test('the lookout lists all high-value goods first, followed by any cash still due', () => {
  const s = legacyChallenge(900, { provisions: { quantity: 2, cost: 10 }, prisms: { quantity: 1, cost: 32 } })
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
    assert.equal(appraise(settled).exposedValue, toll.exposedValue - toll.crowns)
  }
  const resumed = restore(lost)
  assert.equal(act(resumed, { type: 'resolveBattle', id: 3, result: 'lost', hull: 0 }), resumed)
})

test('a fractional toll on a large lot never confiscates the whole cargo or rewards a refusal', () => {
  const s = legacyChallenge(0, { soundings: { quantity: 12, cost: 240 } })
  const toll = raiderToll(s)
  assert.equal(toll.profile.id, 'cutter')
  assert.equal(toll.exposedValue, 288)
  assert.equal(toll.crowns, 15)
  assert.deepEqual(toll.settlement, { cargo: [{ good: 'soundings', quantity: 1 }], coins: 0, change: 9 })
  const lost = defeat(s)
  assert.deepEqual(lost.cargo.soundings, { quantity: 11, cost: 220 })
  assert.equal(lost.coins, 9)
  assert.equal(appraise(lost).exposedValue, 273)
  assert.equal(lost.xp, s.xp)
  assert.deepEqual(lost.freight, s.freight)
  assert.equal(lost.certificate, s.certificate)
})

test('refusal requires live combat; winning or escaping keeps the cargo and pays no toll', () => {
  const s = legacyChallenge(245, { prisms: { quantity: 3, cost: 76 } })
  assert.equal(raiderToll(s).profile.id, 'corsair')
  const battle = restore(act(s, { type: 'engage' }))
  assert.deepEqual(raiderToll(battle), raiderToll(s))
  assert.equal(act(s, { type: 'evade' }).voyage?.phase, 'battle')
  assert.equal(pay(battle, 'cargo'), battle)
  for (const [result, bounty] of [['escaped',0],['won',25],['boarded',0]] as const) {
    const arrived = act(battle, { type: 'resolveBattle', id: 3, result, hull: 57 })
    if (result === 'boarded') assert.equal(arrived.voyage?.phase, 'prize')
    assert.deepEqual(arrived.cargo, s.cargo)
    assert.equal(arrived.ship.hull, 57)
    assert.equal(arrived.coins, 245 + bounty)
  }
})

test('a light manifest can always pay even if the captain resumes an old hail', () => {
  for (const coins of [0, 1, 4, 5, 80]) {
    const s = legacyChallenge(coins)
    s.ship.hull = 1
    const owedOnDefeat = Math.min(5, Math.floor(coins / 2))
    assert.equal(raiderToll(s).crowns, owedOnDefeat)
    assert.equal(pay(s, 'cargo'), s)
    const paid = pay(s, 'crowns')
    assert.equal(paid.port, 'copperfall')
    assert.equal(paid.coins, coins - owedOnDefeat)
    assert.deepEqual(raiderToll(s).settlement, {cargo: [], coins: owedOnDefeat, change: 0})
    const lost = defeat(s)
    assert.equal(lost.coins, coins - owedOnDefeat)
    assert.equal(lost.port, 'copperfall')
    assert.equal(lost.certificate, 'aboard')
    assert.deepEqual(lost.freight, s.freight)
  }
})

test('every posted tender conserves appraised wealth, including multiple whole crates and mixed purses', () => {
  for (const cash of [0, 1, 4, 5, 100, 101, 140, 319, 320, 600, 5_000]) {
    for (const glass of [0, 1, 3, 8]) {
      for (const machinery of [0, 1, 2]) {
        for (const prisms of [0, 1, 2]) {
          const docked = preparedManifest(cash + glass + machinery + prisms, cash)
          docked.cargo.glass = { quantity: glass, cost: glass * 9 }
          docked.cargo.machinery = { quantity: machinery, cost: machinery * 15 }
          docked.cargo.prisms = { quantity: prisms, cost: prisms * 28 }
          const sailing = act(docked, { type: 'sail', to: 'copperfall' })
          const s = act(sailing, { type: 'continueVoyage' })
          const toll = raiderToll(s)
          const paid = toll.settlement.cargo.length ? pay(s, 'cargo') : defeat(s)
          assert.equal(paid.voyage, null)
          assert.ok(paid.coins >= 0)
          assert.equal(appraise(paid).exposedValue, Math.max(0, toll.exposedValue - toll.crowns))
        }
      }
    }
  }
})

test('the forecast matches seeded hails across the full rate range and reflects the increase in corsair risk', () => {
  const draws = 25_000
  let previousCorsairs = 0
  for (const wealth of [75, 200, 320]) {
    const forecast = raiderForecast(preparedManifest(123, wealth))
    const counts = LEVY_BANDS.map(() => 0)
    const ships = { scout: 0, cutter: 0, corsair: 0 }
    const rates = new Set<number>()
    let steepCorsairs = 0
    for (let seed = 0; seed < draws; seed++) {
      const terms = rollPirate(seed, 3, wealth)
      const rate = terms.rate!
      const band = LEVY_BANDS.findIndex(b => rate >= b.min && rate <= b.max)
      assert.ok(band >= 0)
      counts[band]++
      ships[terms.opponent]++
      rates.add(rate)
      if (rate >= 36 && terms.opponent === 'corsair') steepCorsairs++
      assert.ok(terms.crowns >= forecast.low && terms.crowns <= forecast.high)
      assert.ok(terms.crowns >= wealth * 0.05 && terms.crowns <= wealth * 0.5)
    }
    assert.equal(rates.size, 46, 'every whole percentage from 5 to 50 is reachable')
    for (const [index, band] of LEVY_BANDS.entries()) {
      assert.ok(Math.abs(100 * counts[index] / draws - band.chance) < 1)
    }
    for (const { profile, chance } of forecast.ships) {
      assert.ok(Math.abs(100 * ships[profile.id] / draws - chance) < 1)
    }
    assert.ok(ships.corsair > previousCorsairs && ships.corsair < ships.cutter)
    assert.ok(steepCorsairs / counts[3] > ships.corsair / draws)
    previousCorsairs = ships.corsair
  }
})

test('the departure draw survives hail, engagement, reload and a replay of the same departure', () => {
  const docked = preparedManifest(7, 125)
  docked.cargo.prisms = { quantity: 3, cost: 76 }
  const forecast = raiderForecast(docked)
  assert.equal(forecast.exposedValue, 200)
  assert.deepEqual([forecast.low, forecast.high], [10, 100])
  assert.match(assessPlaytest('What might a raider ask?', docked, 'chart').answer, /10–100 crowns/)
  const sailed = act(docked, { type: 'sail', to: 'copperfall' })
  const snapshot = sailed.voyage!.pirate!
  assert.deepEqual(snapshot, rollPirate(7, 3, forecast.exposedValue))
  assert.deepEqual(act(restore(docked), { type: 'sail', to: 'glasshouse' }).voyage!.pirate, snapshot)
  const hailed = act(restore(sailed), { type: 'continueVoyage' })
  const quote = raiderToll(hailed)
  assert.equal(quote.profile.id, snapshot.opponent)
  assert.equal(quote.crowns, snapshot.crowns)
  assert.deepEqual(raiderToll(restore(hailed)), quote)
  assert.deepEqual(raiderToll(restore(act(hailed, { type: 'engage' }))), quote)
  assert.deepEqual(pay(hailed, 'cargo').cargo, defeat(hailed).cargo)
  assert.equal(pay(hailed, 'cargo').coins, defeat(hailed).coins)

  const old = JSON.parse(JSON.stringify(sailed))
  delete old.pirateSeed
  delete old.voyage.pirate
  const migrated = restore(old)
  assert.deepEqual(restore(old), migrated)
  assert.deepEqual(restore(migrated), migrated)
  assert.equal(act(migrated, { type: 'continueVoyage' }).voyage?.phase, 'raider')
})

test('the opening Watch passage is free even for seeds that draw maximum demands later', () => {
  let seed = 0
  while (seed < 25_000 && rollPirate(seed, 3, 200).rate !== 50) seed++
  assert.ok(seed < 25_000)
  const start = initialState(seed)
  const firstPassage = act(start, { type: 'sail', to: 'glasshouse' })
  assert.equal(firstPassage.drill, 'briefing')
  assert.equal(firstPassage.voyage?.pirate, undefined)
  const cleared = act(restore(firstPassage), { type: 'endDrill', skip: true })
  const landed = act(cleared, { type: 'continueVoyage' })
  assert.equal(landed.port, 'glasshouse')
  assert.equal(landed.coins, start.coins)
  for (const coins of [0, 1, 2, 3, 17, 200]) {
    const sailed = act(preparedManifest(seed, coins), { type: 'sail', to: 'copperfall' })
    const hail = act(restore(sailed), { type: 'continueVoyage' })
    assert.equal(hail.voyage?.pirate?.rate, 50)
    assert.equal(raiderToll(hail).crowns, Math.floor(coins / 2))
    assert.equal(pay(hail, 'crowns').coins, coins - Math.floor(coins / 2))
  }
})
