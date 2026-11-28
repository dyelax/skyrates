import assert from 'node:assert/strict'
import test from 'node:test'
import { clearIslets, isletCourse, isletOutline, skyIsletsNear } from '../src/world-islets'
import {
  initWorldFlight,
  nearbyHail,
  provokeWorldMerchant,
  retireWorldContact,
  stepWorldFlight,
  validWorldFlight,
  WORLD_PORTS,
} from '../src/world-flight'
import { refreshLocalTraffic } from '../src/world-locals'
import { routeWeather } from '../src/weather'

const start = () =>
  initWorldFlight({
    seed: 18,
    origin: 'sunstep',
    destination: 'glasshouse',
    weather: routeWeather('sunstep', 'glasshouse', 1),
    encounter: 'none',
  })
const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)
test('regional islets share a stable footprint with the map and preserve berths and through-lanes', () => {
  const positions = [
    { x: 3900, y: -2900 },
    { x: 12500, y: -7700 },
    { x: 22400, y: -4600 },
    { x: 28200, y: -21000 },
  ]
  const all = positions.flatMap((p) => skyIsletsNear(p, 2400))
  assert(all.length > 80)
  assert.equal(new Set(all.map((i) => i.kind)).size, 6)
  assert.equal(new Set(all.map((i) => i.region)).size, 4)
  for (const i of all) {
    const nearby = skyIsletsNear(i, 1)
    assert.equal(nearby.length, 1)
    assert.deepEqual(nearby[0], i)
    assert(isletOutline(i).every((v) => dist(v, i) <= i.radius + 0.001))
    for (const port of Object.values(WORLD_PORTS)) assert(dist(i, port) >= 640)
  }
  assert(skyIsletsNear({ x: 5040, y: -3780 }, 1250).some((i) => i.blend > 0.35 && i.region !== i.neighbor))
  const first = all[0],
    outline = isletOutline(first),
    tip = outline[0]
  const v = { x: (tip.x + first.x) * 0.5, y: (tip.y + first.y) * 0.5, vx: 0, vy: 0 }
  clearIslets(v)
  const once = { ...v }
  clearIslets(v)
  assert(dist(v, once) < 0.000001)
  const f = { x: first.x - first.radius - 75, y: first.y },
    to = { x: first.x + first.radius + 75, y: first.y }
  assert.notDeepEqual(isletCourse(f, to), to)
})
test('scheduled merchant traffic upgrades old saves, freezes during reload, and records actual player aggression', () => {
  const f = start()
  assert(f.traffic.filter((n) => n.local?.kind === 'harbor').length >= 2)
  f.traffic = f.traffic.filter((n) => !n.local)
  assert(validWorldFlight(f))
  stepWorldFlight(f, { helm: 0, throttle: 2 }, 1 / 60)
  const actor = f.traffic.find((n) => n.local?.kind === 'harbor')!
  assert(actor)
  f.player.x = actor.ship.x - 22
  f.player.y = actor.ship.y
  assert.equal(nearbyHail(f), undefined)
  assert.equal(nearbyHail(f, true)?.id, actor.id)
  assert.equal(provokeWorldMerchant(f, actor.id), 'evading')
  const restored = JSON.parse(JSON.stringify(f))
  assert(validWorldFlight(restored))
  for (let i = 0; i < 40; i++) {
    stepWorldFlight(f, { helm: 0.6, throttle: 3 }, 1 / 30)
    stepWorldFlight(restored, { helm: 0.6, throttle: 3 }, 1 / 30)
  }
  assert.deepEqual(restored, f)
  assert(retireWorldContact(f, actor.id))
  refreshLocalTraffic(f)
  assert(!f.traffic.some((ship) => ship.id === actor.id))
  const next = initWorldFlight({
    seed: 19,
    origin: 'sunstep',
    destination: 'copperfall',
    weather: f.weather,
    encounter: 'none',
    previous: f,
  })
  assert(!next.traffic.some((ship) => ship.id === actor.id))
  assert(next.spentIds.includes(actor.id))
  assert(validWorldFlight(next))
})
test('independent circuits occupy inhabited outposts and move without adding any automatic tolls', () => {
  const f = start()
  const isle = skyIsletsNear({ x: 5100, y: -3900 }, 1500).find((i) => i.kind !== 'wild' && i.radius > 45)!
  f.player.x = isle.x + isle.radius + 140
  f.player.y = isle.y
  refreshLocalTraffic(f)
  const locals = f.traffic.filter((actor) => actor.local)
  assert(locals.length >= 4)
  const a = locals.find((n) => dist(n.ship, f.player) < 500)!
  const before = { ...a.ship }
  const hostile = f.traffic.filter((a) => a.kind === 'raider').map((a) => a.id)
  for (let i = 0; i < 240; i++) stepWorldFlight(f, { helm: 0, throttle: 0 }, 1 / 60)
  assert(dist(before, a.ship) > 40)
  assert.deepEqual(
    f.traffic.filter((a) => a.kind === 'raider').map((a) => a.id),
    hostile,
  )
  assert(validWorldFlight(JSON.parse(JSON.stringify(f))))
})
