import { PORT_IDS, type PortId } from './data'
import { wrapAngle, type Point } from './battle-model'
import type { WeatherReport } from './weather'

export const WORLD_PORTS: Record<PortId, Point> = {
  sunstep: { x: 0, y: 0 },
  glasshouse: { x: 10080, y: -7560 },
  copperfall: { x: 20580, y: 1512 },
  meridian: { x: 27972, y: -24108 },
}
export type WorldSiteId = 'market' | 'shipyard' | 'authority' | 'dockworker' | 'civic'
export interface WorldSite {
  id: WorldSiteId
  position: Point
  radius: number
  berth: Point
}
export interface WorldTown {
  center: Point
  island: { rx: number; ry: number }
  berth: Point
  sites: WorldSite[]
}
function makeTown(port: PortId): WorldTown {
  const berth = WORLD_PORTS[port],
    east = port === 'sunstep' || port === 'copperfall' ? 1 : -1
  const island = { rx: 154, ry: 101 },
    center = { x: berth.x - 191 * east, y: berth.y }
  const sites: WorldSite[] = []
  const perimeter: [WorldSiteId, number, number][] = [
    ['dockworker', 0, 18],
    ['market', -0.94, 24],
    ['shipyard', 0.96, 27],
    ['authority', -2.35, 22],
    ['civic', 2.46, 20],
  ]
  for (const [id, angle, radius] of perimeter) {
    const dx = Math.cos(angle) * east,
      dy = Math.sin(angle)
    const position = { x: center.x + 148 * dx, y: center.y + 100 * dy }
    sites.push({
      id,
      radius,
      position,
      berth:
        id === 'dockworker'
          ? { ...berth }
          : { x: center.x + (155 + radius + 28) * dx, y: center.y + (108 + radius + 28) * dy },
    })
  }
  return { center, island, berth: { ...berth }, sites }
}
export const WORLD_TOWNS = Object.fromEntries(PORT_IDS.map((id) => [id, makeTown(id)])) as Record<
  PortId,
  WorldTown
>
// Normalized shore in elliptical town coordinates, shared by the sky island
// painter and the hull collision boundary. Docks retain a supported landing.
export function worldCoastRadius(port: PortId, angle: number) {
  const town = WORLD_TOWNS[port],
    phase = PORT_IDS.indexOf(port) * 1.23 + 0.56
  let edge =
    0.895 +
    0.089 * Math.cos(angle * 3 + phase) +
    0.059 * Math.sin(angle * 5 - 0.8 * phase) +
    0.035 * Math.cos(angle * 8 + 1.2) +
    0.017 * Math.sin(angle * 17 + phase)
  for (const site of town.sites) {
    const a = Math.atan2(
      (site.position.y - town.center.y) / town.island.ry,
      (site.position.x - town.center.x) / town.island.rx,
    )
    const diff = wrapAngle(a - angle)
    edge = Math.max(edge, 0.82 + 0.17 * Math.exp((-diff * diff) / 0.052))
  }
  return edge
}
export const WORLD_TOWN_RADIUS = 510
export const WORLD_NOTICE_RADIUS = 430
export const WORLD_BREAKOFF_RADIUS = 560
export const WORLD_DOCK_RADIUS = 118
export const WORLD_HAIL_RADIUS = 122
export const WORLD_STEP = 1 / 60
export type Throttle = 0 | 1 | 2 | 3
type ContactKind = 'none' | 'tender' | 'raiders'

export interface WorldPose extends Point {
  vx: number
  vy: number
  heading: number
  angularSpeed: number
  heel: number
  heave: number
  throttle: Throttle
}
export interface WorldTraffic {
  id: string
  name: string
  kind: 'merchant' | 'raider' | 'tender'
  behavior: 'sailing' | 'watching' | 'pursuing' | 'evading' | 'struck'
  clearSeconds: number
  raided: boolean
  disposition: 'passing' | 'distressed' | 'hostile'
  ship: WorldPose
  route: PortId[]
  next: number
  mooring?: Point
}
export interface WorldFlight {
  version: 1
  seed: number
  origin: PortId
  destination: PortId
  weather: WeatherReport
  load: number
  elapsed: number
  skyTimeAtDeparture?: number
  distance: number
  remainder: number
  safe: boolean
  spentIds: string[]
  departed: boolean
  cooldown: number
  encounter: ContactKind
  contactId: string | null
  player: WorldPose
  traffic: WorldTraffic[]
}
export interface WorldDeparture {
  seed: number
  origin: PortId
  destination: PortId
  weather: WeatherReport
  encounter: ContactKind
  load?: number
  safe?: boolean
  previous?: WorldFlight
}

const bound = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y)
const bearing = (p: Point, q: Point) => Math.atan2(q.y - p.y, q.x - p.x)
const TAU = 2 * Math.PI
const speeds = [0, 32, 63, 94] as const
function hash(seed: number, salt: number) {
  let n = Math.imul(seed ^ Math.imul(salt + 5, 0x27d4eb2d), 0x85ebca6b)
  n = Math.imul(n ^ (n >>> 15), 0xc2b2ae35)
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000
}

function pose(x: number, y: number, heading: number, throttle: Throttle): WorldPose {
  return {
    x,
    y,
    heading,
    throttle,
    vx: throttle ? Math.cos(heading) * speeds[throttle] : 0,
    vy: throttle ? Math.sin(heading) * speeds[throttle] : 0,
    angularSpeed: 0,
    heel: 0,
    heave: 0,
  }
}

// Effects vary smoothly over hundreds of chart units. Wind is air movement in
// chart units/s. Lift is a normalized updraft, rendered as aircraft heave.
export function worldAir(f: Pick<WorldFlight, 'seed' | 'elapsed' | 'weather'>, at: Point) {
  const { weather, elapsed: t } = f,
    phase = (f.seed % 8191) * 0.0021
  const intensity = weather.severity
  const wave = Math.sin(at.x / 410 + at.y / 540 + phase + t * 0.22)
  const gust = wave * (0.38 + 0.62 * Math.sin(at.y / 360 - t * 0.07 + phase))
  const wind = {
    x: weather.wind.x * 18 * (1 + intensity * gust * 0.72),
    y: weather.wind.y * 18 * (1 + intensity * gust * 0.72),
  }
  const band = Math.sin(at.x / 630 + at.y / 830 + phase * 0.8)
  const lift = Math.max(0, Math.sin(at.x / 290 + phase) * Math.cos(at.y / 360 - phase * 0.4)) ** 2
  const strength = 2.5 + intensity * 10
  const current = {
    x: strength * band * Math.cos(at.y / 960 + phase),
    y: strength * 0.8 * Math.sin(at.y / 520 - at.x / 870 + phase),
  }
  return { wind, current, lift, gust }
}

function fly(ship: WorldPose, helm: number, throttle: Throttle, f: WorldFlight, load: number, pilot: boolean) {
  const dt = WORLD_STEP,
    air = worldAir(f, ship),
    advection = { x: air.wind.x + air.current.x, y: air.wind.y + air.current.y }
  const relativeSpeed = Math.hypot(ship.vx - advection.x, ship.vy - advection.y)
  const speedRatio = bound(relativeSpeed / 94, 0, 1)
  const gustYaw = f.weather.severity * air.gust * 0.04 * speedRatio
  const yaw = (helm * (1.5 - 0.82 * speedRatio)) / (1 + 0.22 * load) + gustYaw
  ship.angularSpeed +=
    (yaw - ship.angularSpeed) * (1 - Math.exp(-dt / (0.24 + speedRatio * 0.18 + load * 0.12)))
  ship.heading = wrapAngle(ship.heading + ship.angularSpeed * dt)
  const cx = Math.cos(ship.heading),
    sy = Math.sin(ship.heading)
  const forward = (ship.vx - advection.x) * cx + (ship.vy - advection.y) * sy
  const sideways = -(ship.vx - advection.x) * sy + (ship.vy - advection.y) * cx
  const target = speeds[throttle] * (1 - 0.1 * load) * (pilot ? 1 : 0.88)
  const grip = (throttle === 0 ? 1.48 : 1.12) / (1 + 0.48 * load)
  const ahead = target + (forward - target) * Math.exp(-grip * dt)
  const slip = sideways * Math.exp((-2.85 * dt) / (1 + 0.25 * load))
  ship.vx = cx * ahead - sy * slip + advection.x
  ship.vy = sy * ahead + cx * slip + advection.y
  ship.x += ship.vx * dt
  ship.y += ship.vy * dt
  const bank = bound(ship.angularSpeed * speedRatio * 0.84, -0.62, 0.62)
  const swell = Math.sin(f.elapsed * (1.45 + f.weather.severity * 0.45) + ship.x / 150 + ship.y / 280)
  const heel = bank + swell * (0.009 + 0.045 * f.weather.severity) + air.gust * f.weather.severity * 0.035
  ship.heel += (heel - ship.heel) * (1 - Math.exp(-dt * 4.6))
  const heave = swell * (0.7 + 3.4 * f.weather.severity) + air.lift * 5
  ship.heave += (heave - ship.heave) * (1 - Math.exp(-2.25 * dt))
  ship.throttle = throttle
}

const routes: PortId[][] = [
  ['sunstep', 'glasshouse', 'copperfall'],
  ['glasshouse', 'sunstep', 'copperfall'],
  ['copperfall', 'meridian', 'glasshouse'],
  ['meridian', 'glasshouse', 'sunstep'],
  ['sunstep', 'copperfall', 'meridian'],
  ['glasshouse', 'meridian', 'copperfall'],
]
const names = ['Plum Schooner', 'Glass Carrier', 'Yard Packet', 'Survey Barge', 'Ash Kestrel', 'Grey Moth']
function trafficFor(seed: number): WorldTraffic[] {
  return routes.map((route, i) => {
    const first = WORLD_PORTS[route[0]],
      next = WORLD_PORTS[route[1]],
      a = bearing(first, next)
    const progress = 0.12 + 0.72 * hash(seed, i),
      side = (hash(seed, i + 12) - 0.5) * 215
    return {
      id: 'lane-' + i,
      name: names[i],
      kind: i < 4 ? 'merchant' : 'raider',
      behavior: 'sailing',
      clearSeconds: 0,
      raided: false,
      disposition: 'passing',
      ship: pose(
        first.x + (next.x - first.x) * progress - Math.sin(a) * side,
        first.y + (next.y - first.y) * progress + Math.cos(a) * side,
        a,
        1,
      ),
      route: [...route],
      next: 1,
    }
  })
}

export function initWorldFlight(input: WorldDeparture): WorldFlight {
  const { origin, destination, encounter } = input,
    seed = input.seed >>> 0
  const from = WORLD_PORTS[origin],
    to = WORLD_PORTS[destination]
  const prior = input.previous?.origin === origin ? input.previous.player : undefined
  const start = prior ?? from
  const a =
    origin === destination
      ? origin === 'sunstep' || origin === 'copperfall'
        ? 0
        : Math.PI
      : bearing(start, worldCourse(start, to))
  const tied = origin === destination
  const traffic = input.previous
    ? structuredClone(input.previous.traffic.filter((n) => n.id.startsWith('lane-')))
    : trafficFor(seed)
  const spentIds = input.previous?.spentIds.filter((id) => id.startsWith('lane-')) ?? []
  const safe = input.safe ?? false
  for (const n of traffic)
    n.disposition = n.kind === 'raider' && !safe && !spentIds.includes(n.id) ? 'hostile' : 'passing'
  const contactId = encounter === 'none' || tied || safe ? null : encounter + '-' + seed
  if (contactId) {
    const along = 0.36 + hash(seed, 81) * 0.11,
      crossing = (hash(seed, 34) - 0.5) * 35
    const mooring = {
      x: from.x + (to.x - from.x) * along - Math.sin(a) * crossing,
      y: from.y + (to.y - from.y) * along + Math.cos(a) * crossing,
    }
    const tender = encounter === 'tender'
    traffic.push({
      id: contactId,
      name: tender ? 'Neri’s tender' : 'Toll raider',
      kind: tender ? 'tender' : 'raider',
      behavior: 'sailing',
      clearSeconds: 0,
      raided: false,
      disposition: tender ? 'distressed' : 'hostile',
      mooring,
      ship: pose(mooring.x + 48, mooring.y, a + Math.PI * 0.5, 1),
      route: [],
      next: 0,
    })
  }
  const player = prior ? { ...prior } : pose(start.x, start.y, a, tied ? 0 : 2)
  if (!tied && !input.previous) {
    player.x += Math.cos(a) * 80
    player.y += Math.sin(a) * 80
    clearLand(player)
  }
  return {
    version: 1,
    seed,
    origin,
    destination,
    weather: structuredClone(input.weather),
    load: bound(input.load ?? 0, 0, 1),
    elapsed: 0,
    skyTimeAtDeparture: input.previous ? (input.previous.skyTimeAtDeparture ?? 0) + input.previous.elapsed : 0,
    distance: 0,
    departed: false,
    remainder: 0,
    cooldown: 0,
    encounter,
    contactId,
    traffic,
    safe,
    spentIds,
    player,
  }
}

function advanceTraffic(f: WorldFlight, actor: WorldTraffic) {
  const s = actor.ship
  const orbit = f.elapsed * 0.15 + (f.seed % 17)
  let goal: Point
  const gap = dist(s, f.player)
  const engaged = actor.behavior === 'pursuing' || actor.behavior === 'evading'
  if (engaged) {
    actor.clearSeconds = gap > WORLD_BREAKOFF_RADIUS ? actor.clearSeconds + WORLD_STEP : 0
    if (actor.clearSeconds >= 4) endWorldPursuit(f, actor.id)
  }
  if (actor.behavior === 'struck') {
    fly(s, 0, 0, f, 0.18, false)
    clearLand(s)
    return
  }
  if (actor.disposition === 'hostile' && !engaged && !f.safe && !f.spentIds.includes(actor.id)) {
    if (gap < WORLD_NOTICE_RADIUS) actor.behavior = 'watching'
    else if (gap > WORLD_NOTICE_RADIUS + 80) actor.behavior = 'sailing'
  }
  let throttle: Throttle = 2
  if (actor.behavior === 'pursuing' || actor.behavior === 'watching') {
    goal = { x: f.player.x + f.player.vx * 0.75, y: f.player.y + f.player.vy * 0.75 }
    throttle = actor.behavior === 'watching' && gap < 190 ? 1 : 3
  } else if (actor.behavior === 'evading') {
    const a = bearing(f.player, s)
    goal = { x: s.x + 500 * Math.cos(a), y: s.y + 500 * Math.sin(a) }
    throttle = 3
  } else if (actor.mooring) {
    goal = { x: actor.mooring.x + 50 * Math.cos(orbit), y: actor.mooring.y + 50 * Math.sin(orbit) }
    throttle = dist(s, goal) > 25 ? 1 : 0
  } else {
    if (dist(s, WORLD_PORTS[actor.route[actor.next]]) < 105) actor.next = (actor.next + 1) % actor.route.length
    goal = WORLD_PORTS[actor.route[actor.next]]
  }
  const via = worldCourse(s, goal)
  let aim = bearing(s, via)
  if (actor.behavior === 'pursuing' && gap < 240 && via === goal) {
    // Bring the physical hull around to present a rail once in cannon range.
    const port = wrapAngle(aim + Math.PI / 2 - s.heading),
      starboard = wrapAngle(aim - Math.PI / 2 - s.heading)
    aim = s.heading + (Math.abs(port) < Math.abs(starboard) ? port : starboard)
    throttle = gap < 120 ? 0 : 1
  }
  const steerClear = (other: Point) => {
    const gap = dist(s, other)
    if (gap >= 104 || gap < 0.01) return
    const side = wrapAngle(bearing(s, other) - s.heading)
    if (Math.abs(side) > 1.43) return
    aim += (side >= 0 ? -1 : 1) * (1 - gap / 104) * 1.32
  }
  if (!engaged) steerClear(f.player)
  for (const other of f.traffic) if (other !== actor) steerClear(other.ship)
  const error = wrapAngle(aim - s.heading)
  fly(s, bound(error * 2 - s.angularSpeed * 0.35, -1, 1), throttle, f, 0.18, false)
  clearLand(s)
}

export function stepWorldFlight(
  f: WorldFlight,
  input: { helm: number; throttle: Throttle },
  seconds: number,
  afterStep?: (dt: number) => void | false,
) {
  if (!Number.isFinite(seconds) || seconds <= 0) return
  f.remainder += Math.min(0.25, seconds)
  while (f.remainder + 1e-10 >= WORLD_STEP) {
    f.remainder = Math.max(0, f.remainder - WORLD_STEP)
    f.elapsed += WORLD_STEP
    const x = f.player.x,
      y = f.player.y
    fly(f.player, bound(input.helm, -1, 1), input.throttle, f, f.load, true)
    clearLand(f.player)
    f.distance += Math.hypot(f.player.x - x, f.player.y - y)
    f.departed ||= dist(f.player, WORLD_PORTS[f.origin]) > 150
    f.cooldown = Math.max(0, f.cooldown - WORLD_STEP)
    for (const actor of f.traffic) advanceTraffic(f, actor)
    if (afterStep?.(WORLD_STEP) === false) {
      f.remainder = 0
      break
    }
  }
}

function expel(ship: WorldPose, dx: number, dy: number, penetration: number) {
  ship.x += dx * penetration
  ship.y += dy * penetration
  const normalSpeed = Math.min(0, ship.vx * dx + ship.vy * dy)
  ship.vx -= normalSpeed * dx
  ship.vy -= normalSpeed * dy
}

// The collision body is the solid island with a small vessel clearance, plus
// each projecting building. At the edge forward motion becomes quay-side slip.
function blocked(a: Point, b: Point, town: WorldTown) {
  const rx = town.island.rx + 17,
    ry = town.island.ry + 17
  const x = (a.x - town.center.x) / rx,
    y = (a.y - town.center.y) / ry
  const dx = (b.x - a.x) / rx,
    dy = (b.y - a.y) / ry
  const t = bound(-(x * dx + y * dy) / (dx * dx + dy * dy || 1), 0, 1)
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 < 1
}

// A pilot pointing at a mooring on the far side of an island can follow
// ordinary helm headings around its perimeter, without crossing the land.
const rings = new Map<WorldTown, Point[]>(
  Object.values(WORLD_TOWNS).map((town) => [
    town,
    Array.from({ length: 16 }, (_, i) => ({
      x: town.center.x + Math.cos((i * TAU) / 16) * (town.island.rx + 64),
      y: town.center.y + Math.sin((i * TAU) / 16) * (town.island.ry + 61),
    })),
  ]),
)
export function worldCourse(from: Point, destination: Point): Point {
  const town = Object.values(WORLD_TOWNS)
    .filter((t) => dist(from, t.center) < 650 && blocked(from, destination, t))
    .sort((a, b) => dist(from, a.center) - dist(from, b.center))[0]
  if (!town) return destination
  const ring = rings.get(town)!
  let best = Infinity,
    via = destination
  for (let i = 0; i < ring.length; i++) {
    const first = ring[i],
      approach = dist(from, first)
    if (approach < 10 || blocked(from, first, town)) continue
    for (const direction of [-1, 1]) {
      let previous = first,
        length = approach
      for (let steps = 0; steps < ring.length; steps++) {
        const at = ring[(i + steps * direction + ring.length) % ring.length]
        length += dist(previous, at)
        if (!blocked(at, destination, town)) {
          const cost = length + dist(at, destination)
          if (cost < best) {
            best = cost
            via = first
          }
          break
        }
        previous = at
      }
    }
  }
  return via
}

function clearLand(ship: WorldPose) {
  for (const port of PORT_IDS) {
    const town = WORLD_TOWNS[port],
      x = ship.x - town.center.x,
      y = ship.y - town.center.y
    if (Math.abs(x) > 240 || Math.abs(y) > 190) continue
    const rx = town.island.rx,
      ry = town.island.ry,
      u = x / rx,
      v = y / ry,
      radius = Math.hypot(u, v)
    const angle = Math.atan2(v, u),
      coast = worldCoastRadius(port, angle)
    if (radius < 1e-6) expel(ship, 1, 0, rx * coast + 10)
    else {
      const slope = (worldCoastRadius(port, angle + 0.006) - worldCoastRadius(port, angle - 0.006)) / 0.012
      const gx = (u / radius + (slope * v) / (radius * radius)) / rx,
        gy = (v / radius - (slope * u) / (radius * radius)) / ry
      const magnitude = Math.hypot(gx, gy),
        penetration = (coast - radius) / magnitude + 10
      if (penetration > 0) expel(ship, gx / magnitude, gy / magnitude, Math.min(rx, penetration))
    }
    for (const site of town.sites) {
      const dx = ship.x - site.position.x,
        dy = ship.y - site.position.y,
        gap = Math.hypot(dx, dy)
      const clearance = site.radius + 11
      if (gap < clearance) expel(ship, gap ? dx / gap : 1, gap ? dy / gap : 0, clearance - gap)
    }
  }
}

export function nearbyWorldSite(f: WorldFlight): { port: PortId; siteId: WorldSiteId } | undefined {
  if (Math.hypot(f.player.vx, f.player.vy) > 47) return
  let nearest = 54,
    found: { port: PortId; siteId: WorldSiteId } | undefined
  for (const port of PORT_IDS)
    for (const site of WORLD_TOWNS[port].sites) {
      const distance = dist(site.berth, f.player)
      if (distance < nearest) {
        nearest = distance
        found = { port, siteId: site.id }
      }
    }
  return found
}
export function nearbyDock(f: WorldFlight) {
  if (Math.hypot(f.player.vx, f.player.vy) > 47) return
  const port =
    nearbyWorldSite(f)?.port ?? PORT_IDS.find((id) => dist(WORLD_PORTS[id], f.player) <= WORLD_DOCK_RADIUS)
  if (port && (port !== f.origin || f.departed)) return port
}
export function moorWorldFlight(f: WorldFlight, port: PortId) {
  const siteId = nearbyWorldSite(f)?.siteId
  const berth = WORLD_TOWNS[port].sites.find((site) => site.id === siteId)?.berth ?? WORLD_PORTS[port]
  Object.assign(f.player, pose(berth.x, berth.y, f.player.heading, 0))
  f.origin = port
  f.departed = false
}
export function nearestTraffic(f: WorldFlight, radius = 180) {
  let nearest: WorldTraffic | undefined
  for (const actor of f.traffic) {
    const gap = dist(f.player, actor.ship)
    if (gap < radius) {
      nearest = actor
      radius = gap
    }
  }
  return nearest
}
function hailKind(f: WorldFlight, actor: WorldTraffic, manual: boolean) {
  if (f.spentIds.includes(actor.id) || ['pursuing', 'evading', 'struck'].includes(actor.behavior)) return
  const gap = dist(f.player, actor.ship)
  if (f.contactId === actor.id && gap <= (manual ? 165 : WORLD_HAIL_RADIUS))
    return f.encounter === 'tender' ? 'tender' : 'raiders'
  if (actor.kind === 'raider' && actor.disposition === 'hostile' && !f.safe && gap <= (manual ? 165 : 63))
    return 'raiders'
  if (manual && actor.kind === 'merchant' && gap <= 165) return 'merchant'
}
export function nearbyHail(
  f: WorldFlight,
  manual = false,
): { id: string; kind: 'tender' | 'raiders' | 'merchant' } | undefined {
  if (f.cooldown > 0) return
  let nearest = Infinity,
    found: ReturnType<typeof nearbyHail>
  for (const actor of f.traffic) {
    const kind = hailKind(f, actor, manual),
      gap = dist(f.player, actor.ship)
    if (kind && gap < nearest) {
      nearest = gap
      found = { id: actor.id, kind }
    }
  }
  return found
}
export function resolveHail(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (!actor || f.cooldown > 0) return false
  const closeDemand =
    actor.kind === 'raider' && actor.behavior === 'pursuing' && dist(f.player, actor.ship) <= 165
  if (!hailKind(f, actor, true) && !closeDemand) return false
  toPassing(f, actor)
  return true
}
function toPassing(f: WorldFlight, actor: WorldTraffic) {
  const id = actor.id
  actor.behavior = 'sailing'
  actor.clearSeconds = 0
  actor.disposition = 'passing'
  if (actor.mooring) {
    delete actor.mooring
    actor.route = [f.destination, f.origin]
    actor.next = 0
  }
  if (f.contactId === id) f.contactId = null
  if (!f.spentIds.includes(id)) f.spentIds.push(id)
  f.cooldown = 8
}

// The campaign already owns a pending exchange. Accept its resolution even
// if wind carried the two vessels beyond initial calling distance meanwhile.
export function settleWorldContact(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (!actor || (f.spentIds.includes(id) && actor.behavior !== 'struck')) return false
  toPassing(f, actor)
  return true
}
export function startWorldPursuit(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (
    !actor ||
    f.safe ||
    f.spentIds.includes(id) ||
    actor.disposition !== 'hostile' ||
    dist(actor.ship, f.player) > 600
  )
    return false
  actor.behavior = 'pursuing'
  actor.clearSeconds = 0
  return true
}
export function endWorldPursuit(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (!actor || !['pursuing', 'evading'].includes(actor.behavior)) return false
  toPassing(f, actor)
  return true
}
export function strikeWorldContact(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (!actor) return false
  toPassing(f, actor)
  actor.behavior = 'struck'
  actor.ship.throttle = 0
  return true
}
export function nearbyAttackableMerchant(f: WorldFlight, id?: string) {
  if (f.safe) return
  return f.traffic
    .filter((n) => n.kind === 'merchant' && !n.raided && (!id || n.id === id) && dist(n.ship, f.player) <= 185)
    .sort((a, b) => dist(f.player, a.ship) - dist(f.player, b.ship))[0]
}
export function provokeWorldMerchant(f: WorldFlight, id: string) {
  const actor = nearbyAttackableMerchant(f, id)
  if (!actor) return
  actor.raided = true
  // Escorted packet hulls turn a rail outwards; unarmed bulk traders run.
  const defending = actor.id === 'lane-1' || actor.id === 'lane-3'
  actor.behavior = defending ? 'pursuing' : 'evading'
  actor.disposition = defending ? 'hostile' : 'passing'
  actor.clearSeconds = 0
  return actor.behavior
}
// An older checkpoint may already display a hail or battle, without a world
// pose. Reconstruct its committed physical contact exactly once on migration.
export function retireWorldContact(f: WorldFlight, id: string) {
  const index = f.traffic.findIndex((n) => n.id === id)
  if (index < 0) return false
  f.traffic.splice(index, 1)
  if (!f.spentIds.includes(id)) f.spentIds.push(id)
  if (f.contactId === id) f.contactId = null
  return true
}
export function worldContactPose(f: WorldFlight, id: string) {
  const actor = f.traffic.find((n) => n.id === id)
  if (!actor) return
  const p = f.player,
    opponent = actor.ship
  return {
    player: { ...p },
    opponent: { ...opponent },
    relative: {
      x: opponent.x - p.x,
      y: opponent.y - p.y,
      vx: opponent.vx - p.vx,
      vy: opponent.vy - p.vy,
    },
  }
}
export function restoreWorldContact(f: WorldFlight): string | undefined {
  const actor = f.traffic.find((n) => n.id === f.contactId)
  if (!actor) return
  const a = f.player.heading
  f.player.x = actor.ship.x - Math.cos(a) * 78
  f.player.y = actor.ship.y - Math.sin(a) * 78
  f.player.throttle = 0
  f.player.vx = f.player.vy = 0
  f.departed = true
  return actor.id
}

const point = (v: unknown): v is Point => record(v) && finite(v.x) && finite(v.y)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object')
const portId = (v: unknown): v is PortId => PORT_IDS.includes(v as PortId)
const throttleId = (v: unknown) => finite(v) && Number.isInteger(v) && v >= 0 && v <= 3
function validPose(v: unknown) {
  return (
    record(v) &&
    point(v) &&
    [v.vx, v.vy, v.heading, v.angularSpeed, v.heel, v.heave].every(finite) &&
    throttleId(v.throttle)
  )
}
function validWeather(v: unknown) {
  return (
    record(v) &&
    point(v.wind) &&
    finite(v.severity) &&
    v.severity >= 0 &&
    v.severity <= 1 &&
    finite(v.knots) &&
    v.knots >= 0 &&
    typeof v.summary === 'string' &&
    typeof v.bearing === 'string' &&
    ['clear', 'haze', 'rain', 'frost', 'squall'].includes(String(v.kind)) &&
    ['spring', 'summer', 'autumn', 'winter'].includes(String(v.season))
  )
}
function validTraffic(v: unknown) {
  return (
    record(v) &&
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    v.id.length <= 64 &&
    typeof v.name === 'string' &&
    ['merchant', 'raider', 'tender'].includes(String(v.kind)) &&
    ['passing', 'distressed', 'hostile'].includes(String(v.disposition)) &&
    ['sailing', 'watching', 'evading', 'pursuing', 'struck'].includes(String(v.behavior)) &&
    finite(v.clearSeconds) &&
    v.clearSeconds >= 0 &&
    v.clearSeconds < 4 + WORLD_STEP &&
    typeof v.raided === 'boolean' &&
    validPose(v.ship) &&
    Array.isArray(v.route) &&
    v.route.length <= PORT_IDS.length &&
    v.route.every(portId) &&
    finite(v.next) &&
    Number.isInteger(v.next) &&
    v.next >= 0 &&
    (v.mooring === undefined
      ? v.next < v.route.length
      : point(v.mooring) && v.route.length === 0 && v.next === 0)
  )
}
export function validWorldFlight(v: unknown): v is WorldFlight {
  if (
    !record(v) ||
    v.version !== 1 ||
    !portId(v.origin) ||
    !portId(v.destination) ||
    !finite(v.seed) ||
    !Number.isInteger(v.seed) ||
    v.seed < 0 ||
    v.seed > 0xffffffff ||
    !validPose(v.player) ||
    !validWeather(v.weather) ||
    !finite(v.load) ||
    v.load < 0 ||
    v.load > 1 ||
    (v.skyTimeAtDeparture !== undefined && (!finite(v.skyTimeAtDeparture) || v.skyTimeAtDeparture < 0)) ||
    !finite(v.elapsed) ||
    v.elapsed < 0 ||
    !finite(v.distance) ||
    v.distance < 0 ||
    !finite(v.cooldown) ||
    v.cooldown < 0 ||
    v.cooldown > 8 ||
    !finite(v.remainder) ||
    v.remainder < 0 ||
    v.remainder >= WORLD_STEP ||
    typeof v.safe !== 'boolean' ||
    typeof v.departed !== 'boolean' ||
    !['none', 'tender', 'raiders'].includes(String(v.encounter)) ||
    !Array.isArray(v.traffic) ||
    v.traffic.length > 12 ||
    !v.traffic.every(validTraffic) ||
    !Array.isArray(v.spentIds) ||
    v.spentIds.length > 12 ||
    !v.spentIds.every((id) => typeof id === 'string')
  )
    return false
  const ids = new Set(v.traffic.map((n) => n.id))
  return (
    ids.size === v.traffic.length &&
    new Set(v.spentIds).size === v.spentIds.length &&
    v.spentIds.every((id) => /^lane-[0-9]+$|^(raiders|tender)-[0-9]+$/.test(id)) &&
    (v.contactId === null ||
      (typeof v.contactId === 'string' && ids.has(v.contactId) && !v.spentIds.includes(v.contactId)))
  )
}
