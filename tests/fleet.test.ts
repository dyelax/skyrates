import test from 'node:test'
import assert from 'node:assert/strict'
import { GUN_POSITIONS } from '../src/drill'
import { buildAirframe, buildGangway, buildHand, FLOATS_PER_VERTEX } from '../src/fleet/airframes'

function values(mesh: Float32Array, field: number) {
  return new Set(mesh.filter((_value, index) => index % FLOATS_PER_VERTEX === field))
}

test('fitted deck guns use the same side, station and muzzle as the flight model', () => {
  for (let count = 1; count <= 4; count++) {
    const fitted = GUN_POSITIONS.slice(0, count)
    const hull = buildAirframe('wayfarer', fitted)
    const motion = values(hull, 12)
    for (const [index, gun] of GUN_POSITIONS.entries()) {
      const joint = 3 + gun.station * 2 + (gun.side === 'port' ? 0 : 1)
      assert.equal(motion.has(joint), index < count)
      for (let i = 0; i < hull.length; i += FLOATS_PER_VERTEX) {
        if (hull[i + 12] !== joint) continue
        assert.equal(hull[i + 13], gun.station === 0 ? 11 : -12)
        assert.equal(Math.sign(hull[i + 15]), gun.side === 'port' ? -1 : 1)
      }
    }
  }
})

test('all three hulls have a solid keel, articulated rotors and individually identifiable folding sails', () => {
  for (const [fleet, swatch] of [
    ['wayfarer', 3],
    ['watch', 5],
    ['wasp', 4],
  ] as const) {
    const mesh = buildAirframe(fleet, GUN_POSITIONS)
    assert.equal(mesh.length % (3 * FLOATS_PER_VERTEX), 0)
    assert.ok(mesh.every(Number.isFinite))
    assert.ok(Math.min(...values(mesh, 1)) < -7)
    assert.ok(Math.max(...values(mesh, 1)) > 18)
    assert.ok(values(mesh, 12).has(1))
    assert.ok(values(mesh, 12).has(2))
    assert.ok(values(mesh, 11).has(swatch))
  }
})

test('boarding meshes have moving arms and legs, opposing coats, and solid gangways', () => {
  const allied = buildHand(false),
    rival = buildHand(true)
  assert.notDeepEqual(allied, rival)
  assert.deepEqual(
    [...values(allied, 12)].sort((a, b) => a - b),
    [0, 7, 8, 9, 10],
  )
  const planks = buildGangway()
  assert.equal(planks.length % (FLOATS_PER_VERTEX * 3), 0)
  assert.ok(Math.max(...values(planks, 0)) >= 28)
  assert.ok(planks.every(Number.isFinite))
})
