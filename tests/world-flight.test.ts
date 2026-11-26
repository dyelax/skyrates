import assert from 'node:assert/strict'
import {
  startWorldPursuit,
  endWorldPursuit,
  provokeWorldMerchant,
  retireWorldContact,
  strikeWorldContact,
} from '../src/world-flight'
import test from 'node:test'
import {
  initWorldFlight,
  stepWorldFlight,
  worldAir,
  worldCourse,
  validWorldFlight,
  nearestTraffic,
  nearbyDock,
  nearbyWorldSite,
  nearbyHail,
  resolveHail,
  restoreWorldContact,
  moorWorldFlight,
  worldContactPose,
  WORLD_PORTS,
  WORLD_TOWNS,
  type WorldFlight,
  type Throttle,
} from '../src/world-flight'
import { type PortId } from '../src/data'
import { type WeatherReport } from '../src/weather'
const calm: WeatherReport = {
  kind: 'clear',
  season: 'summer',
  summary: 'Calm',
  wind: { x: 0, y: 0 },
  bearing: 'N',
  knots: 0,
  severity: 0.12,
}
const storm: WeatherReport = {
  kind: 'squall',
  season: 'autumn',
  summary: 'Squall',
  wind: { x: -0.65, y: -0.65 },
  bearing: 'NW',
  knots: 22,
  severity: 0.9,
}
function start(
  seed = 41,
  weather = calm,
  load = 0,
  origin: PortId = 'sunstep',
  destination: PortId = 'glasshouse',
) {
  return initWorldFlight({ seed, origin, destination, weather, load, encounter: 'raiders' })
}
const distance = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)
function guide(f: WorldFlight, destination: { x: number; y: number }, throttle: Throttle) {
  const s = f.player,
    at = worldCourse(s, destination)
  const a = Math.atan2(at.y - s.y, at.x - s.x)
  const desired = Math.atan2(Math.sin(a - s.heading), Math.cos(a - s.heading))
  const rate = Math.atan2(s.vy, s.vx)
  const slip = Math.atan2(Math.sin(rate - s.heading), Math.cos(rate - s.heading))
  return { helm: Math.max(-1, Math.min(1, 2.4 * desired - 0.45 * s.angularSpeed - 0.7 * slip)), throttle }
}
function advance(f: WorldFlight, seconds: number, helm: number, throttle: Throttle) {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepWorldFlight(f, { helm, throttle }, 1 / 60)
}
test('flight and moving traffic keep continuous momentum through frames and a serialized restore', () => {
  const a = start(),
    b = structuredClone(a)
  for (let i = 0; i < 60; i++) stepWorldFlight(a, { helm: 0.75, throttle: 3 }, 1 / 30)
  for (let i = 0; i < 240; i++) stepWorldFlight(b, { helm: 0.75, throttle: 3 }, 1 / 120)
  assert.deepEqual(a, b)
  assert(validWorldFlight(JSON.parse(JSON.stringify(a))))
  const saved = JSON.parse(JSON.stringify(a))
  advance(a, 3, -0.75, 2)
  advance(saved, 3, -0.75, 2)
  assert.deepEqual(a, saved)
  assert(a.player.heel < 0)
  const broken = structuredClone(a)
  broken.traffic[0].route = []
  assert(!validWorldFlight(broken))
})
test('weather and load produce distinct handling, with signed banking and controlled rollout', () => {
  const a = start(),
    b = start(41, storm),
    loaded = start(41, calm, 1)
  for (const f of [a, b, loaded]) {
    Object.assign(f.player, { x: 4600, y: 5400, heading: 0, vx: 65, vy: 0 })
    advance(f, 8, 0, 3)
  }
  assert(distance(a.player, b.player) > 40)
  assert(distance(a.player, loaded.player) > 40)
  for (const f of [a, b, loaded]) advance(f, 2, 1, 3)
  assert(a.player.heel > 0.3 && b.player.heel > 0.3)
  assert(a.player.heading > loaded.player.heading)
  const bank = a.player.heel
  advance(a, 2, 0, 2)
  assert(Math.abs(a.player.heel) < bank * 0.12)
  assert.notDeepEqual(worldAir(b, b.player), worldAir(b, { x: b.player.x + 650, y: b.player.y + 500 }))
})
test('safe opening and multiple distinct contacts are physical, spend once and survive leaving port', () => {
  const f = start(),
    a = f.traffic[0],
    raiders = f.traffic.filter((n) => n.kind === 'raider' && n.id !== f.contactId)
  Object.assign(f.player, { x: a.ship.x, y: a.ship.y })
  assert.equal(nearestTraffic(f)?.id, a.id)
  assert.equal(nearbyHail(f, true)?.kind, 'merchant')
  assert.equal(nearbyHail(f), undefined)
  assert(resolveHail(f, a.id))
  assert(!resolveHail(f, a.id))
  for (const actor of raiders) {
    f.cooldown = 0
    Object.assign(f.player, { x: actor.ship.x + 50, y: actor.ship.y })
    assert.equal(nearbyHail(f)?.id, actor.id)
    assert(resolveHail(f, actor.id))
  }
  const restored = restoreWorldContact(f)
  assert.equal(restored, f.contactId)
  f.cooldown = 0
  assert.equal(nearbyHail(f)?.kind, 'raiders')
  assert.equal(worldContactPose(f, restored!)?.relative.vy, f.traffic.at(-1)!.ship.vy - f.player.vy)
  const safe = initWorldFlight({
    seed: 77,
    origin: 'glasshouse',
    destination: 'sunstep',
    weather: calm,
    encounter: 'none',
    previous: f,
    safe: true,
  })
  for (const actor of safe.traffic.filter((n) => n.kind === 'raider')) {
    Object.assign(safe.player, { x: actor.ship.x, y: actor.ship.y })
    assert.equal(nearbyHail(safe), undefined)
  }
  assert.equal(safe.traffic.length, 6)
  assert.equal(safe.spentIds.length, 3)
  assert.deepEqual(safe.traffic[0].ship, f.traffic[0].ship)
})
test('neighboring harbors take two to four minutes, all berth centers are usable and a quay stops penetration', () => {
  for (const [origin, dest] of [
    ['sunstep', 'glasshouse'],
    ['glasshouse', 'copperfall'],
  ] as const) {
    const f = start(41, calm, 0, origin, dest)
    const q = WORLD_PORTS[dest]
    for (let i = 0; i < 60 * 242 && !nearbyDock(f); i++) {
      const d = distance(f.player, q)
      stepWorldFlight(f, guide(f, q, d < 226 ? 1 : 3), 1 / 60)
    }
    assert.equal(nearbyDock(f), dest)
    assert(f.elapsed > 120 && f.elapsed < 240)
    const town = WORLD_TOWNS[dest]
    for (const site of town.sites) {
      Object.assign(f.player, { ...site.berth, vx: 0, vy: 0 })
      assert.equal(nearbyWorldSite(f)?.siteId, site.id)
    }
    moorWorldFlight(f, dest)
    assert.equal(f.player.throttle, 0)
    const angle = Math.atan2(town.center.y - f.player.y, town.center.x - f.player.x)
    Object.assign(f.player, { heading: angle, vx: 0, vy: 0 })
    advance(f, 8, 0, 3)
    const qx = (f.player.x - town.center.x) / town.island.rx,
      qy = (f.player.y - town.center.y) / town.island.ry
    assert(Math.hypot(qx, qy) > 1)
  }
})

test('noticed raiders chase a real hull, can be outrun or paid, and never issue duplicate demands', () => {
  const f = start(),
    actor = f.traffic.at(-1)!
  Object.assign(f.player, { x: actor.ship.x - 310, y: actor.ship.y, heading: Math.PI, vx: -40, vy: 0 })
  advance(f, 0.1, 0, 1)
  assert.equal(actor.behavior, 'watching')
  assert(startWorldPursuit(f, actor.id))
  const last = { ...actor.ship }
  advance(f, 1, 0, 2)
  assert(distance(actor.ship, last) > 8)
  Object.assign(f.player, { x: actor.ship.x - 800, y: actor.ship.y })
  advance(f, 2, 0, 3)
  assert(actor.clearSeconds >= 1.9)
  f.player.x = actor.ship.x - 180
  advance(f, 0.1, 0, 2)
  assert.equal(actor.clearSeconds, 0)
  assert.equal(actor.behavior, 'pursuing')
  f.player.x = actor.ship.x - 810
  advance(f, 4.1, 0, 3)
  assert.equal(actor.behavior, 'sailing')
  assert(f.spentIds.includes(actor.id))
  assert(!startWorldPursuit(f, actor.id))
  const other = f.traffic.find((n) => n.kind === 'raider' && n.id !== actor.id)!
  Object.assign(f.player, { x: other.ship.x + 40, y: other.ship.y })
  advance(f, 8.2, 0, 0)
  Object.assign(f.player, { x: other.ship.x + 40, y: other.ship.y })
  assert(startWorldPursuit(f, other.id))
  assert(resolveHail(f, other.id))
  assert(!startWorldPursuit(f, other.id))
  assert(!endWorldPursuit(f, other.id))
})
test('armed and unarmed traders react only to the pilot’s own attack; struck and retired ship IDs persist', () => {
  const f = start(),
    traders = f.traffic.filter((n) => n.kind === 'merchant'),
    first = traders[0],
    second = traders[1]
  for (const actor of [first, second]) {
    assert.equal(actor.behavior, 'sailing')
    Object.assign(f.player, { x: actor.ship.x + 55, y: actor.ship.y })
    assert.equal(provokeWorldMerchant(f, actor.id), actor === first ? 'evading' : 'pursuing')
    assert.equal(provokeWorldMerchant(f, actor.id), undefined)
  }
  assert(strikeWorldContact(f, second.id))
  assert.equal(second.behavior, 'struck')
  assert(retireWorldContact(f, second.id))
  assert(!worldContactPose(f, second.id))
  assert(validWorldFlight(JSON.parse(JSON.stringify(f))))
  const keep = initWorldFlight({
    seed: 52,
    origin: f.origin,
    destination: 'copperfall',
    weather: calm,
    encounter: 'none',
    previous: f,
  })
  assert.equal(keep.traffic.length, 5)
  assert(keep.spentIds.includes(second.id))
  assert.deepEqual(keep.player, f.player)
  let steps = 0
  stepWorldFlight(keep, { helm: 0, throttle: 3 }, 0.1, (dt) => {
    steps++
    assert.equal(dt, 1 / 60)
  })
  assert.equal(steps, 6)
  assert(validWorldFlight(keep))
})
