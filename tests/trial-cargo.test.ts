import { strict as assert } from 'node:assert'
import test from 'node:test'
import { TrialCargo, type TrialCargoId } from '../src/trial-cargo'
import { fallingPoint } from '../src/salvage'

const area = { width: 940, top: 30, bottom: 600 }
const player = { x: 200, y: 320 }
const still = { x: 0, y: 0 }
const load = { manifest: { good: 'glass' as const, quantity: 6 }, free: 12 }
const wreck = (cargoId: TrialCargoId) => ({
  cargoId,
  name: cargoId,
  role: 'hostile',
  ship: { x: 360, y: 310, hull: 0 },
})

test('each actual hostile wreck falls once, even while another hostile or a prize remains', () => {
  const cargo = new TrialCargo(load, 'copperfall')
  const raider = wreck('first-raider')
  assert.equal(cargo.drop({ ...raider, ship: { ...raider.ship, hull: 1 } }, player, area), false)
  assert.equal(cargo.drop({ ...raider, role: 'struck' }, player, area), false)
  assert.equal(cargo.drop({ ...raider, cargoId: undefined, role: 'merchant' }, player, area), false)
  assert.equal(cargo.drop(raider, player, area), true)
  cargo.advance(player, still, area, 9)
  assert.equal(cargo.drop(raider, player, area), false)
  assert.equal(cargo.drop(wreck('wing-raider'), player, area), true)
  assert.deepEqual(
    cargo.fields.map((f) => f.state.remaining),
    [5, 14],
  )
  cargo.advance(player, still, area, 6)
  assert.deepEqual(
    cargo.fields.map((f) => f.state.remaining),
    [0, 8],
  )
  assert.equal(cargo.count, 0)
  cargo.advance(player, still, area, 8)
  assert.equal(cargo.nearest(player, still, area), undefined)
  assert.deepEqual(
    cargo.receipts.map((r) => [r.sourceId, r.quantity, r.dropped]),
    [
      ['first-raider', 0, 2],
      ['wing-raider', 0, 2],
    ],
  )
})

test('crossing and terminal pickups share the actual free hold across sources', () => {
  const cargo = new TrialCargo({ ...load, free: 1 }, 'sunstep')
  cargo.drop(wreck('first-raider'), player, area)
  cargo.drop(wreck('second-crossing'), player, area)
  const first = cargo.fields[0].state
  // Both manifests dropped cargo into the same space. Only one berth exists.
  const at = fallingPoint(first.crates[0], first.remaining - 0.02, still, area)
  assert.equal(cargo.advance(at, still, area, 0.02), 1)
  assert.deepEqual(
    cargo.receipts.map((r) => [r.quantity, r.dropped]),
    [
      [1, 2],
      [0, 3],
    ],
  )
  assert.equal(cargo.remaining, 0)
  assert.equal(cargo.advance(at, still, area, 0.02), 0)
  assert.equal(cargo.drop(wreck('first-raider'), player, area), false)
})
