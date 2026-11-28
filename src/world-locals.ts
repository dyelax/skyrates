import { PORT_IDS, type PortId } from './data'
import { islandNoise, skyIsletsNear } from './world-islets'
import { WORLD_PORTS } from './world-coordinates'
import type { WorldFlight, WorldTraffic, WorldPose } from './world-flight'
import type { Point } from './battle-model'

export interface LocalRun {
  kind: 'circuit' | 'shuttle' | 'harbor'
  center: Point
  major: number
  minor: number
  bearing: number
  phase: number
  period: number
}
const colors: Record<PortId, readonly string[]> = {
  sunstep: ['Bramble', 'Pippin', 'Clover', 'Saffron', 'Honey', 'Plum', 'Lark', 'Flax'],
  glasshouse: ['Iris', 'Lily', 'Opal', 'Mallow', 'Rose', 'Laurel', 'Bell', 'Pearl'],
  copperfall: ['Ember', 'Rivet', 'Cinder', 'Bronze', 'Anvil', 'Copper', 'Ash', 'Forge'],
  meridian: ['Polar', 'Silver', 'Star', 'Moon', 'Rime', 'Lantern', 'Frost', 'Aurora'],
}
const names = [
  'Swallow',
  'Swift',
  'Lighter',
  'Linnet',
  'Wren',
  'Tern',
  'Runner',
  'Packet',
  'Skylark',
  'Tug',
  'Cutter',
  'Gull',
]
const TAU = Math.PI * 2
const ASCENT_RANGE = 1090,
  LEAVE_RANGE = 1500
export function localPose(run: LocalRun, clock: number): WorldPose {
  const w = TAU / run.period,
    a = run.phase + clock * w,
    c = Math.cos(a),
    s = Math.sin(a),
    u = Math.cos(run.bearing),
    v = Math.sin(run.bearing)
  const x = run.major * c,
    y = run.minor * s,
    dx = -run.major * s * w,
    dy = run.minor * c * w
  const vx = u * dx - v * dy,
    vy = v * dx + u * dy
  return {
    x: run.center.x + u * x - v * y,
    y: run.center.y + v * x + u * y,
    vx,
    vy,
    heading: Math.atan2(vy, vx),
    throttle: 1,
    heel: 0,
    angularSpeed: 0,
    heave: 0,
  }
}

function resident(id: string, region: PortId, seed: number, run: LocalRun, clock: number): WorldTraffic {
  const name =
    colors[region][Math.floor(islandNoise(seed, 51) * 8)] +
    ' ' +
    names[Math.floor(islandNoise(seed, 52) * names.length)]
  return {
    id,
    name,
    kind: 'merchant',
    disposition: 'passing',
    behavior: 'sailing',
    raided: false,
    clearSeconds: 0,
    ship: localPose(run, clock),
    route: [region],
    next: 0,
    local: run,
  }
}

/** Only stream ships outside the visible play area. Each schedule has a stable
 * world identity and keeps running analytically outside the simulated vicinity. */
export function refreshLocalTraffic(f: WorldFlight) {
  const clock = (f.skyTimeAtDeparture ?? 0) + f.elapsed
  f.traffic = f.traffic.filter(
    (a) =>
      !a.local ||
      a.behavior !== 'sailing' ||
      Math.hypot(a.ship.x - f.player.x, a.ship.y - f.player.y) < LEAVE_RANGE,
  )
  const present = new Set([...f.traffic.map((a) => a.id), ...f.spentIds])
  const admit = (id: string, region: PortId, seed: number, run: LocalRun) => {
    if (present.has(id)) return
    const position = localPose(run, clock)
    if (Math.hypot(position.x - f.player.x, position.y - f.player.y) > ASCENT_RANGE) return
    const ship = resident(id, region, seed, run, clock)
    const contactIndex = f.contactId ? f.traffic.findIndex((a) => a.id === f.contactId) : -1
    if (contactIndex < 0) f.traffic.push(ship)
    else f.traffic.splice(contactIndex, 0, ship)
    present.add(id)
  }
  for (const isle of skyIsletsNear(f.player, ASCENT_RANGE + 390)) {
    // Wild rocks may have a survey launch. Most inhabited rocks support a
    // local lighter or a longer ferry circuit around the neighboring lane.
    if (islandNoise(isle.seed, 63) < (isle.kind === 'wild' ? 0.63 : 0.12)) continue
    const major = isle.radius + 51 + islandNoise(isle.seed, 61) * 56
    const shuttle = islandNoise(isle.seed, 62) < 0.37
    const rx = shuttle ? major + 175 : major,
      ry = isle.radius + 39 + islandNoise(isle.seed, 64) * 32
    admit('local:' + isle.id.slice(6), isle.region, isle.seed, {
      kind: shuttle ? 'shuttle' : 'circuit',
      center: { x: isle.x, y: isle.y },
      major: rx,
      minor: Math.min(rx, ry),
      bearing: islandNoise(isle.seed, 65) * TAU,
      phase: islandNoise(isle.seed, 66) * TAU,
      period:
        ((islandNoise(isle.seed, 67) < 0.5 ? -1 : 1) * TAU * (rx + ry)) /
        2 /
        (19 + 14 * islandNoise(isle.seed, 68)),
    })
  }
  for (const [i, port] of PORT_IDS.entries()) {
    const p = WORLD_PORTS[port],
      side = port === 'sunstep' || port === 'copperfall' ? 1 : -1
    if (Math.hypot(p.x - f.player.x, p.y - f.player.y) > ASCENT_RANGE + 700) continue
    for (let n = 0; n < 2; n++) {
      const seed = 7381 + i * 13 + n
      admit('harbor:' + port + ':' + n, port, seed, {
        kind: 'harbor',
        center: { x: p.x + side * (n ? 390 : 160), y: p.y + (n ? 150 : -25) },
        major: n ? 239 : 103,
        minor: n ? 128 : 77,
        bearing: side * 0.48,
        phase: 0.9 + i * 1.8 + n * 1.7,
        period: n ? -38 : 25,
      })
    }
  }
}
export function persistentTrafficId(id: string) {
  return /^lane-\d+$|^local:-?\d+:-?\d+$|^harbor:(sunstep|glasshouse|copperfall|meridian):[01]$/.test(id)
}
