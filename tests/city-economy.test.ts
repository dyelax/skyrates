import { flyToNextStop, settleThenFlyToPort } from './passage-fixture'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  act,
  cargoUsed,
  cityOrder,
  cityService,
  GOOD_IDS,
  initialState,
  loadGame,
  PORT_IDS,
  priceAt,
  stockAt,
  upgradeOffer,
  type GameState,
  type PortId,
} from '../src/model'
import { CITY_ECONOMY, nextPosting } from '../src/city-economy'

const restore = (state: unknown) => loadGame({ getItem: () => JSON.stringify(state) })
function cross(state: GameState, to: PortId) {
  let result = act(state, { type: 'sail', to })
  if (result.drill) result = act(result, { type: 'endDrill', skip: true })
  result = flyToNextStop(result)
  if (result.voyage?.phase === 'tender') result = settleThenFlyToPort(result, { type: 'tender', help: false })
  if (result.voyage?.phase === 'raider') {
    result = act(result, { type: 'engage' })
    result = settleThenFlyToPort(result, { type: 'resolveBattle', id: result.voyage!.id, result: 'escaped', hull: result.ship.hull })
  }
  assert.equal(result.port, to)
  return result
}

test('each port has a distinct catalogue, a source-exclusive export and a destination order', () => {
  const fresh = initialState()
  for (const port of PORT_IDS) {
    const signature = CITY_ECONOMY[port].specialty
    for (const other of PORT_IDS) assert.equal(stockAt(fresh, other, signature) > 0, port === other)
    assert.ok(stockAt(fresh, port, 'provisions') > 0)
    assert.equal(stockAt(fresh, port, CITY_ECONOMY[port].order.good), 0)
  }
  assert.equal(act(fresh, { type: 'buy', good: 'prisms', quantity: 1 }), fresh)
  assert.equal(upgradeOffer(fresh, 'guns').available, false)
  assert.equal(act(fresh, { type: 'upgrade', upgrade: 'guns' }), fresh)
})

test('the allocation survives reload, cannot be replenished by selling, and returns after its posting', () => {
  const start = initialState()
  const units = stockAt(start, start.port, 'grafts')
  let s = act(start, { type: 'buy', good: 'grafts', quantity: units })
  s = restore(s)
  assert.equal(stockAt(s, s.port, 'grafts'), 0)
  assert.equal(act(s, { type: 'buy', good: 'grafts', quantity: 1 }), s)
  s = act(s, { type: 'sell', good: 'grafts', quantity: 1 })
  assert.equal(stockAt(s, s.port, 'grafts'), 0)
  assert.equal(s.pricesSeen.sunstep?.stock?.grafts, 0)
  s = cross(s, 'copperfall')
  s = cross(s, 'sunstep')
  assert.ok(s.day >= nextPosting(start.day))
  assert.ok(stockAt(s, s.port, 'grafts') > 0)
})

test('the public garden order consumes two imported scions and pays the posted amount once', () => {
  let s = act(initialState(), { type: 'buy', good: 'grafts', quantity: 3 })
  const unitCost = s.cargo.grafts.cost / 3
  s = cross(s, 'copperfall')
  const before = s.coins
  const order = cityOrder(s)
  assert.equal(order.pay, order.quantity * priceAt(s, s.port, 'grafts').sell + order.premium)
  assert.ok(order.ready)
  s = act(s, { type: 'fillCityOrder' })
  assert.equal(s.coins, before + order.pay)
  assert.deepEqual(s.cargo.grafts, { quantity: 1, cost: unitCost })
  s = restore(s)
  assert.ok(cityOrder(s).filled)
  assert.equal(act(s, { type: 'fillCityOrder' }), s)
  const next = { ...s, day: nextPosting(s.day) }
  assert.ok(!cityOrder(next).filled)
})

test('the cooling rack transfers material and fee into cost basis, and the survey sheet records remote lots', () => {
  let s = cross(initialState(), 'glasshouse')
  s = act(s, { type: 'buy', good: 'glass', quantity: 2 })
  const before = s.coins
  const basis = s.cargo.glass.cost
  assert.ok(cityService(s)?.ready)
  s = act(s, { type: 'useCityService' })
  assert.deepEqual(s.cargo.prisms, { quantity: 1, cost: basis + 8 })
  assert.equal(cargoUsed(s), 1)
  assert.equal(s.coins, before - 8)
  assert.equal(act(s, { type: 'useCityService' }), s)
  s = cross({ ...s, level: 2, mission: 'lit' }, 'meridian')
  s = act(s, { type: 'fillCityOrder' })
  assert.equal(s.cargo.prisms.quantity, 0)
  s = act(s, { type: 'useCityService' })
  for (const port of PORT_IDS) {
    assert.equal(s.pricesSeen[port]?.day, s.day)
    for (const good of GOOD_IDS) {
      assert.deepEqual(s.pricesSeen[port]?.prices[good], priceAt(s, port, good))
      assert.equal(s.pricesSeen[port]?.stock?.[good], stockAt(s, port, good))
    }
  }
})

test('old saves preserve their purchase lots and old chart knowledge while acquiring the new goods', () => {
  const older = JSON.parse(JSON.stringify(act(initialState(), { type: 'buy', good: 'provisions', quantity: 3 })))
  delete older.exchange
  delete older.pricesSeen.sunstep.stock
  for (const good of ['grafts', 'prisms', 'governors', 'soundings']) {
    delete older.cargo[good]
    delete older.pricesSeen.sunstep.prices[good]
  }
  const result = restore(older)
  assert.equal(result.coins, older.coins)
  assert.deepEqual(result.cargo.provisions, older.cargo.provisions)
  assert.deepEqual(result.cargo.prisms, { quantity: 0, cost: 0 })
  assert.equal(result.pricesSeen.sunstep?.prices.prisms, undefined)
  assert.deepEqual(restore(result), result)
})
