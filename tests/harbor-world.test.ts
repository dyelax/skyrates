import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { paints, disposeMeshes } from '../src/voxel/blocks'
import { buildPort, plans } from '../src/voxel/ports'
import { buildPeople } from '../src/voxel/people'
import { mayWalk, walkingPath } from '../src/voxel/navigation'
import { PORT_IDS } from '../src/data'

for (const port of PORT_IDS) {
  test(port + ' connects the landing to its occupied workshops and keeps the captain on the docks', () => {
    const scene = new THREE.Scene(),
      materials = paints(),
      plan = plans[port]
    const set = buildPort(scene, port, materials, false),
      start: [number, number] = [plan.start[0], plan.start[2]]
    assert.equal(new Set(set.sites.map((s) => s.place)).size, 5)
    assert.ok(mayWalk(...start, plan.decks, set.blockades))
    assert.deepEqual(walkingPath(start, [100, -80], plan.decks, set.blockades), [])
    for (const place of ['market', 'authority', 'shipyard', 'civic']) {
      const site = set.sites.find((s) => s.place === place)!
      const approaches = [0, -0.75, 0.75, -1.7, 1.7].flatMap((dx) =>
        [0.6, 1.3].map((dz) => [site.center.x + dx, site.center.z + site.size.z / 2 + dz] as [number, number]),
      )
      const routes = approaches.map((end) => walkingPath(start, end, plan.decks, set.blockades))
      assert.ok(
        routes.some((route) => route.length && route.every((p) => mayWalk(...p, plan.decks, set.blockades))),
        place + ' must be approachable on foot',
      )
    }
    disposeMeshes(scene, materials, [])
  })
}
test('the porter makes a round trip, stops with the crew, and the vendor hands a visible parcel to the customer', () => {
  const scene = new THREE.Scene(),
    materials = paints(),
    plan = plans.sunstep,
    crew = buildPeople(scene, 'sunstep', plan, materials)
  const start = crew.local.position.clone()
  let maxDistance = 0,
    arrived = false,
    returned = false,
    consecutive = 0,
    stoppedBesideShip = false,
    parcelTravel = false
  let minZ = Infinity,
    maxZ = -Infinity
  for (let step = 0; step < 1800; step++) {
    const previous = crew.local.position.clone()
    crew.update(1 / 30)
    maxDistance = Math.max(maxDistance, crew.local.position.distanceTo(start))
    const atShip = Math.hypot(crew.local.position.x - plan.crew[0], crew.local.position.z - plan.crew[1]) < 2.6
    arrived ||= atShip
    if (arrived && crew.local.position.distanceTo(start) < 0.3) returned = true
    consecutive = atShip && previous.distanceTo(crew.local.position) < 0.001 ? consecutive + 1 : 0
    if (consecutive > 100) stoppedBesideShip = true
    const parcel = scene.getObjectByName('Goods changing hands')!
    if (parcel.visible) {
      minZ = Math.min(minZ, parcel.position.z)
      maxZ = Math.max(maxZ, parcel.position.z)
    }
    parcelTravel ||= maxZ - minZ > 1.85
  }
  assert.ok(maxDistance > 10 && returned && stoppedBesideShip)
  assert.ok(parcelTravel)
  disposeMeshes(scene, materials, [])
})
