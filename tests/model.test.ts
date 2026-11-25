import assert from 'node:assert/strict'
import test from 'node:test'
import {
  act,
  advanceDrill,
  boardingStrength,
  cargoUsed,
  freightOffer,
  greeting,
  initialState,
  INVOICE_COST,
  isUnlocked,
  loadGame,
  priceAt,
  saveGame,
  upgradeOffer,
  type GameState,
  type PortId,
  type GoodId,
} from '../src/model'

function land(state: GameState, to: PortId, tow = true): GameState {
  let next = act(state, { type: 'sail', to })
  if (next.drill) next = act(next, { type: 'endDrill', skip: true })
  next = act(next, { type: 'continueVoyage' })
  if (next.voyage?.phase === 'tender') next = act(next, { type: 'tender', help: tow })
  if (next.voyage?.phase === 'raider') {
    next = act(next, { type: 'engage' })
    next = act(next, { type: 'resolveBattle', id: next.voyage!.id, result: 'escaped', hull: next.ship.hull })
  }
  assert.equal(next.port, to)
  assert.equal(next.voyage, null)
  return next
}

function shippingRun(state: GameState, to: PortId, good: GoodId): GameState {
  const { buy } = priceAt(state, state.port, good)
  const quantity = Math.min(state.ship.hold - cargoUsed(state), Math.floor(state.coins / buy))
  assert.ok(quantity > 0)
  let next = act(state, { type: 'buy', good, quantity })
  next = land(next, to, false)
  return act(next, { type: 'sell', good, quantity })
}

function reload(state: GameState): GameState {
  const database = new Map<string, string>()
  assert.equal(saveGame(state, { setItem: (key, value) => database.set(key, value) }), true)
  return loadGame({ getItem: (key) => database.get(key) ?? null })
}

test('a merchant can pay a mild first raider and fund the beacon with two trade legs and the opening bonded letter', () => {
  let state = act(initialState(7), { type: 'acceptMission' })
  state = act(state, { type: 'takeFreight' })
  state = shippingRun(state, 'glasshouse', 'provisions')
  state = act(state, { type: 'presentCommission' })
  state = shippingRun(state, 'copperfall', 'glass')
  state = act(state, { type: 'sail', to: 'glasshouse' })
  state = act(state, { type: 'continueVoyage' })
  assert.equal(state.voyage?.phase, 'raider')
  state = act(state, { type: 'payToll', id: state.voyage!.id, payment: 'crowns' })
  assert.equal(state.day, 4)
  state = act(state, { type: 'payInvoice' })
  assert.equal(state.certificate, 'aboard')
  state = land(state, 'meridian')
  state = act(state, { type: 'deliverCertificate' })
  assert.equal(state.certificate, 'paid')
  assert.equal(state.coins, 310)
})

test('the beacon invoice can be earned through different circuits, in either opening direction', () => {
  for (const work of [
    [
      ['glasshouse', 'provisions'],
      ['copperfall', 'glass'],
    ],
    [
      ['copperfall', 'provisions'],
      ['sunstep', 'machinery'],
      ['glasshouse', 'provisions'],
    ],
  ] as [PortId, GoodId][][]) {
    let state = act(initialState(), { type: 'acceptMission' })
    assert.equal(isUnlocked(state, 'meridian'), false)
    for (const [to, good] of work) {
      const previous = state.coins
      state = shippingRun(state, to, good)
      assert.ok(state.coins > previous)
    }
    if (state.port !== 'glasshouse') state = land(state, 'glasshouse')
    assert.equal(state.mission, 'accepted')
    state = act(state, { type: 'presentCommission' })
    assert.equal(state.mission, 'invoice')
    assert.ok(state.coins >= INVOICE_COST, 'two or three profitable cargo sales cover the invoice')
    const previous = state.coins
    state = act(state, { type: 'payInvoice' })
    assert.equal(state.mission, 'lit')
    assert.equal(state.coins, previous - INVOICE_COST)
    assert.equal(state.level, 2)
    assert.equal(isUnlocked(state, 'meridian'), true)
    const lit = reload(state)
    assert.deepEqual(lit, state)
    assert.equal(act(lit, { type: 'payInvoice' }), lit)
    state = act(lit, { type: 'chooseAbility', ability: 'broker' })
    assert.equal(state.ability, 'broker')
    assert.equal(act(state, { type: 'chooseAbility', ability: 'gunner' }), state)
    assert.equal(act(state, { type: 'deliverCertificate' }), state)
    state = land(state, 'meridian')
    const claim = act(state, { type: 'deliverCertificate' })
    assert.equal(claim.coins - state.coins, 300)
    state = reload(claim)
    assert.equal(act(state, { type: 'deliverCertificate' }), state)
    assert.match(greeting(state), /beacon captain/)
    state = land(state, 'sunstep')
    assert.match(greeting(state), /first light/i)
  }
})

test('markets enforce capacity and purse and preserve partial sale cost basis across reloads', () => {
  const start = initialState()
  const buy = priceAt(start, 'sunstep', 'provisions').buy
  assert.equal(act(start, { type: 'buy', good: 'provisions', quantity: 13 }), start)
  assert.equal(act(start, { type: 'buy', good: 'machinery', quantity: 3 }), start)
  assert.equal(act(start, { type: 'sell', good: 'provisions', quantity: 1 }), start)
  assert.equal(act(start, { type: 'buy', good: 'provisions', quantity: -1 }), start)
  assert.equal(act(start, { type: 'buy', good: 'provisions', quantity: 0.5 }), start)
  let state = reload(act(start, { type: 'buy', good: 'provisions', quantity: 7 }))
  assert.equal(start.cargo.provisions.quantity, 0)
  assert.equal(state.cargo.provisions.cost, buy * 7)
  const oldQuote = state.pricesSeen.sunstep
  state = land(state, 'glasshouse')
  assert.deepEqual(state.pricesSeen.sunstep, oldQuote)
  assert.deepEqual(state.pricesSeen.glasshouse?.prices.glass, priceAt(state, 'glasshouse', 'glass'))
  state = act(state, { type: 'sell', good: 'provisions', quantity: 3 })
  assert.deepEqual(state.cargo.provisions, { quantity: 4, cost: buy * 4 })
  state = act(state, { type: 'sell', good: 'provisions', quantity: 4 })
  assert.deepEqual(state.cargo.provisions, { quantity: 0, cost: 0 })
})

test('a penniless captain can deliver bonded mail, and arriving twice cannot pay twice', () => {
  let state = { ...initialState(), coins: 0 }
  const offer = freightOffer(state)!
  state = act(state, { type: 'takeFreight' })
  assert.equal(state.coins, 0)
  assert.equal(freightOffer(state), null)
  const sailing = act(state, { type: 'sail', to: offer.to })
  assert.equal(act(sailing, { type: 'buy', good: 'glass', quantity: 1 }), sailing)
  state = act(act(reload(sailing), { type: 'endDrill', skip: true }), { type: 'continueVoyage' })
  assert.equal(state.coins, offer.pay)
  assert.equal(state.freight, null)
  assert.equal(act(state, { type: 'continueVoyage' }), state)
})

test('giving the tender a tow costs a day, changes a later greeting and reserves one contract', () => {
  const first = land(initialState(), 'glasshouse')
  let atTender = act(first, { type: 'sail', to: 'copperfall' })
  atTender = reload(act(atTender, { type: 'continueVoyage' }))
  assert.equal(atTender.voyage?.phase, 'tender')
  const passed = act(atTender, { type: 'tender', help: false })
  let helped = act(atTender, { type: 'tender', help: true })
  assert.equal(helped.day, passed.day + 1)
  assert.equal(helped.notoriety, passed.notoriety + 1)
  assert.match(greeting(helped), /towed her/)
  assert.match(greeting(passed), /ordinary freight/)
  assert.equal(freightOffer(passed)?.special, false)
  assert.equal(freightOffer(helped)?.special, true)
  helped = act(helped, { type: 'takeFreight' })
  const coins = helped.coins
  helped = land(helped, 'sunstep')
  assert.equal(helped.coins, coins + 85)
  helped = land(helped, 'copperfall')
  assert.equal(freightOffer(helped)?.special, false)
})

test('battle rewards, damage and return to port apply once for the active voyage', () => {
  const state = land(land(initialState(), 'glasshouse'), 'copperfall')
  let next = act(state, { type: 'sail', to: 'sunstep' })
  next = act(next, { type: 'continueVoyage' })
  assert.equal(next.voyage?.phase, 'raider')
  next = reload(act(next, { type: 'engage' }))
  assert.equal(next.voyage?.phase, 'battle')
  const id = next.voyage!.id
  assert.equal(act(next, { type: 'resolveBattle', id: id + 1, result: 'won', hull: 70 }), next)
  const won = act(next, { type: 'resolveBattle', id, result: 'boarded', hull: 64 })
  assert.equal(won.coins, next.coins)
  assert.equal(won.voyage?.phase, 'prize')
  assert.equal(won.ship.hull, 64)
  const resumed = reload(won)
  assert.equal(act(resumed, { type: 'resolveBattle', id, result: 'boarded', hull: 64 }), resumed)
  const lost = act(next, { type: 'resolveBattle', id, result: 'lost', hull: 0 })
  assert.ok(lost.ship.hull > 0)
  assert.ok(freightOffer(lost))
  assert.equal(lost.port, 'sunstep')
})

test('shipyard purchases change capacity, boarding strength, guns and hull within their caps', () => {
  let state = { ...initialState(), coins: 4000 }
  const initial = boardingStrength(state)
  state = act(state, { type: 'upgrade', upgrade: 'crew' })
  assert.equal(boardingStrength(state) - initial, 2)
  state = land(state, 'copperfall')
  state = act(state, { type: 'upgrade', upgrade: 'veteran' })
  assert.equal(boardingStrength(state) - initial, 4.5)
  state = act(state, { type: 'upgrade', upgrade: 'guns' })
  assert.equal(state.ship.guns, 1)
  state = act(state, { type: 'upgrade', upgrade: 'hull' })
  assert.equal(state.ship.hull, 125)
  state = land(state, 'sunstep')
  state = act(state, { type: 'upgrade', upgrade: 'hold' })
  assert.equal(state.ship.hold, 16)
  assert.equal(upgradeOffer(state, 'repair').available, false)
})

test('missing, corrupt, and unavailable storage start a fresh voyage log', () => {
  for (const value of [
    null,
    'oops',
    '{"version":1,"cargo":{}}',
    JSON.stringify({ ...initialState(), cargo: { provisions: null } }),
  ]) {
    const result = loadGame({ getItem: () => value })
    assert.deepEqual(result, initialState(result.pirateSeed))
  }
  const result = loadGame({
    getItem: () => {
      throw Error('blocked')
    },
  })
  assert.deepEqual(result, initialState(result.pirateSeed))
  assert.equal(
    saveGame(initialState(), {
      setItem: () => {
        throw Error('quota exceeded')
      },
    }),
    false,
  )
})

test('the initial commission, invoice, and locked area enforce their prerequisites', () => {
  const state = initialState()
  assert.equal(act(state, { type: 'sail', to: 'meridian' }), state)
  assert.equal(act(state, { type: 'chooseAbility', ability: 'broker' }), state)
  const exploring = land(state, 'glasshouse')
  assert.equal(exploring.mission, 'offered')
  assert.equal(act(exploring, { type: 'acceptMission' }), exploring)
  const accepted = act(state, { type: 'acceptMission' })
  assert.equal(act(accepted, { type: 'presentCommission' }), accepted)
  const invoiced = act(land(accepted, 'glasshouse'), { type: 'presentCommission' })
  assert.equal(act(invoiced, { type: 'payInvoice' }), invoiced)
  assert.equal(invoiced.coins, state.coins)
})

test('captain skills improve trading or crew performance immediately after purchase', () => {
  const earning = initialState()
  earning.mission = 'invoice'
  earning.coins = 500
  const paid = act(land(earning, 'glasshouse'), { type: 'payInvoice' })
  const broker = act(paid, { type: 'chooseAbility', ability: 'broker' })
  const before = priceAt(paid, 'glasshouse', 'machinery')
  const after = priceAt(broker, 'glasshouse', 'machinery')
  assert.equal(after.buy, Math.floor(before.buy * 0.9))
  assert.equal(after.sell, before.sell)
  assert.ok(after.buy > after.sell)
  assert.deepEqual(broker.pricesSeen.glasshouse?.prices.machinery, after)
  const leader = act(paid, { type: 'chooseAbility', ability: 'leader' })
  assert.equal(boardingStrength(leader), boardingStrength(paid) * 1.25)
})

test('inconsistent chapter progression and unknown save versions cannot strand a returning captain', () => {
  const fresh = initialState()
  for (const patch of [
    { version: 2 },
    { mission: 'lit', level: 1 },
    { level: 2, mission: 'accepted' },
    { ability: 'broker', level: 1 },
    { specialFreightTaken: true, tender: 'passed' },
    { voyageCount: 1, voyage: { id: 1, from: 'sunstep', to: 'glasshouse', phase: ['raider'] } },
  ]) {
    const invalid = JSON.stringify({ ...fresh, ...patch })
    const result = loadGame({ getItem: () => invalid })
    assert.deepEqual(result, initialState(result.pirateSeed))
  }
})

test('sale receipts report realized gain or loss on the allocated share of a mixed lot', () => {
  // Buy two lots at different markets, then sell them across two receipts.
  let state = act(initialState(), { type: 'buy', good: 'provisions', quantity: 3 })
  state = land(state, 'glasshouse')
  state = act(state, { type: 'buy', good: 'provisions', quantity: 1 })
  const initialCost = state.cargo.provisions.cost
  const firstCost = Math.round(initialCost / 4)
  const firstProceeds = priceAt(state, 'glasshouse', 'provisions').sell
  state = act(state, { type: 'sell', good: 'provisions', quantity: 1 })
  assert.match(state.notice, new RegExp(firstProceeds - firstCost + '-crown profit'))
  assert.equal(state.log[0].text, state.notice)
  assert.equal(state.cargo.provisions.cost, initialCost - firstCost)
  state = land(reload(state), 'sunstep')
  const restProceeds = 3 * priceAt(state, 'sunstep', 'provisions').sell
  state = act(state, { type: 'sell', good: 'provisions', quantity: 3 })
  assert.match(state.log[0].text, new RegExp(initialCost - firstCost - restProceeds + '-crown loss'))
  assert.deepEqual(state.cargo.provisions, { quantity: 0, cost: 0 })
})

test('the opening shipment earns the same XP and carries the same profit through any sale size and reloads', () => {
  const loaded = act(initialState(), { type: 'buy', good: 'provisions', quantity: 12 })
  const arrived = land(loaded, 'glasshouse')
  assert.equal(arrived.cargo.provisions.cost, 48)
  assert.equal(priceAt(arrived, arrived.port, 'provisions').sell, 11)
  for (const sizes of [[12], [2, 7, 3], Array(12).fill(1)]) {
    let captain = arrived
    for (const quantity of sizes) {
      captain = reload(act(captain, { type: 'sell', good: 'provisions', quantity }))
    }
    assert.equal(captain.coins, 162)
    assert.equal(captain.xp - arrived.xp, 8)
    assert.equal(captain.tradeProfitRemainder, 4)
    assert.deepEqual(captain.cargo.provisions, { quantity: 0, cost: 0 })
  }
})

test('old saves preserve earned XP and mixed lot costs regardless of how a partial delivery is divided', () => {
  const arrived = land(initialState(), 'glasshouse')
  const old = JSON.parse(JSON.stringify(arrived))
  delete old.tradeProfitRemainder
  old.xp = 17
  old.cargo.provisions = { quantity: 6, cost: 26 }
  const captain = loadGame({ getItem: () => JSON.stringify(old) })
  assert.equal(captain.xp, 17)
  assert.equal(captain.tradeProfitRemainder, 0)

  const sell = (state: GameState, quantity: number) => reload(act(state, { type: 'sell', good: 'provisions', quantity }))
  const pair = sell(captain, 2)
  const singles = sell(sell(captain, 1), 1)
  assert.deepEqual(singles.cargo, pair.cargo)
  assert.equal(pair.cargo.provisions.cost, 17)
  for (const partial of [pair, singles]) {
    assert.equal(partial.xp, 18)
    assert.equal(partial.tradeProfitRemainder, 3)
    const finished = sell(partial, 4)
    assert.equal(finished.xp, 21)
    assert.equal(finished.tradeProfitRemainder, 0)
  }
})

test('buying and immediately reselling or breaking even leaves banked profit and XP intact', () => {
  let state = { ...initialState(), xp: 15, tradeProfitRemainder: 9 }
  for (let i = 0; i < 3; i++) {
    state = act(state, { type: 'buy', good: 'provisions', quantity: 1 })
    state = act(state, { type: 'sell', good: 'provisions', quantity: 1 })
  }
  assert.ok(state.coins < initialState().coins)
  state.cargo.provisions = { quantity: 1, cost: priceAt(state, state.port, 'provisions').sell }
  state = reload(act(state, { type: 'sell', good: 'provisions', quantity: 1 }))
  assert.match(state.notice, /broke even/i)
  assert.equal(state.xp, 15)
  assert.equal(state.tradeProfitRemainder, 9)
})

test('unacknowledged notices survive later actions, travel, and reload in order', () => {
  const signed = act(initialState(), { type: 'acceptMission' })
  const sailing = act(signed, { type: 'sail', to: 'glasshouse' })
  assert.deepEqual(reload(sailing).pendingNotices, [signed.notice, sailing.notice])
  assert.deepEqual(reload({ ...sailing, pendingNotices: sailing.pendingNotices.slice(1) }).pendingNotices, [
    sailing.notice,
  ])
  const old = JSON.parse(JSON.stringify(signed))
  delete old.pendingNotices
  assert.equal(loadGame({ getItem: () => JSON.stringify(old) }).mission, 'accepted')
})

test('first sailing orders start the watch drill once and checkpoints survive reload', () => {
  let state = act(initialState(), { type: 'sail', to: 'glasshouse' })
  assert.equal(state.drill, 'briefing')
  assert.equal(act(state, { type: 'continueVoyage' }), state)
  assert.equal(act(state, { type: 'endDrill', skip: false }), state)
  assert.equal(advanceDrill(state, 'board'), state)
  for (const stage of ['dodge', 'fire', 'board', 'melee', 'return', 'debrief'] as const) {
    state = reload(advanceDrill(state, stage))
    assert.equal(state.drill, stage)
  }
  const cleared = act(state, { type: 'endDrill', skip: false })
  assert.equal(cleared.ship.hull, 100)
  assert.equal(cleared.coins, state.coins)
  const landed = act(cleared, { type: 'continueVoyage' })
  assert.equal(landed.port, 'glasshouse')
  assert.equal(act(landed, { type: 'sail', to: 'sunstep' }).drill, null)
  const practice = act(landed, { type: 'practiceDrill' })
  assert.equal(practice.drill, 'briefing')
  assert.equal(practice.voyage, null)
  const left = act(reload(practice), { type: 'endDrill', skip: true })
  assert.equal(left.coins, landed.coins)
  assert.equal(left.day, landed.day)
  assert.equal(left.voyageCount, landed.voyageCount)
})

test('legacy ships underway keep their existing four guns when loading the newer register', () => {
  const raw = JSON.parse(JSON.stringify(initialState()))
  delete raw.drill
  delete raw.ship.cannons
  raw.voyageCount = 3
  const old = loadGame({ getItem: () => JSON.stringify(raw) })
  assert.equal(old.ship.cannons, 4)
  assert.equal(old.drill, null)
  const original = initialState()
  assert.equal(original.ship.cannons, 1)
  const slip = land(original, 'copperfall')
  assert.equal(act(slip, { type: 'upgrade', upgrade: 'guns' }).ship.cannons, 2)
})
