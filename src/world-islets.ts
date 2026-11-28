import type { Point } from './battle-model'
import { PORT_IDS, type PortId } from './data'
import { WORLD_PORTS } from './world-coordinates'

export const ISLET_CELL = 680
const TAU = Math.PI * 2
const homeColors: Record<PortId, string> = {
  sunstep: '#a7ad65',
  glasshouse: '#88af98',
  copperfall: '#b08867',
  meridian: '#bbcacf',
}
export type IsletKind = 'village' | 'orchard' | 'yard' | 'shrine' | 'relay' | 'wild'
const kinds: IsletKind[] = ['village', 'orchard', 'yard', 'shrine', 'relay', 'wild']
export interface SkyIslet extends Point {
  id: string
  region: PortId
  neighbor: PortId
  blend: number
  radius: number
  kind: IsletKind
  color: string
  seed: number
}
export function islandNoise(seed: number, salt: number): number {
  let n = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b)
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d)
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296
}
const cache = new Map<string, SkyIslet | null>()
const outlines = new WeakMap<SkyIslet, Point[]>()
function makeIslet(ix: number, iy: number): SkyIslet | null {
  const seed = (Math.imul(ix, 0x85ebca6b) ^ Math.imul(iy, 0xc2b2ae35) ^ 0x671dc23b) >>> 0
  if (islandNoise(seed, 0) < 0.14) return null
  const x = (ix + 0.16 + islandNoise(seed, 1) * 0.68) * ISLET_CELL
  const y = (iy + 0.16 + islandNoise(seed, 2) * 0.68) * ISLET_CELL
  const ranks = PORT_IDS.map((region) => ({
    region,
    distance: Math.hypot(x - WORLD_PORTS[region].x, y - WORLD_PORTS[region].y),
  })).sort((a, b) => a.distance - b.distance)
  const [first, second] = ranks
  if (first.distance < 640) return null
  const radius = 24 + 45 * islandNoise(seed, 3)
  // Leave charted through-lanes open. Their shoulders still carry settlements,
  // including right beside the safe first passage and old encounter positions.
  for (let i = 0; i < PORT_IDS.length; i++)
    for (let j = 0; j < i; j++) {
      const a = WORLD_PORTS[PORT_IDS[i]],
        b = WORLD_PORTS[PORT_IDS[j]],
        dx = b.x - a.x,
        dy = b.y - a.y
      const t = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)
      if (t > 0 && t < 1 && Math.hypot(x - a.x - dx * t, y - a.y - dy * t) < radius + 70) return null
    }
  return {
    id: 'islet:' + ix + ':' + iy,
    x,
    y,
    radius,
    seed,
    kind: kinds[Math.min(kinds.length - 1, Math.floor(islandNoise(seed, 4) * kinds.length))],
    region: first.region,
    neighbor: second.region,
    blend: 0.5 * Math.max(0, 1 - (second.distance - first.distance) / 3500),
    color: homeColors[first.region],
  }
}
export function isletInCell(ix: number, iy: number) {
  const id = ix + ':' + iy
  if (cache.has(id)) return cache.get(id)!
  const island = makeIslet(ix, iy)
  if (cache.size > 2048) cache.clear()
  cache.set(id, island)
  return island
}
/** Center-based query shared by the flight renderer, pocket chart and local schedules. */
export function skyIsletsNear(center: Point, radius: number): SkyIslet[] {
  if (
    !Number.isFinite(radius) ||
    radius < 0 ||
    !Number.isSafeInteger(Math.floor(center.x / ISLET_CELL)) ||
    !Number.isSafeInteger(Math.floor(center.y / ISLET_CELL))
  )
    return []
  const out: SkyIslet[] = []
  for (
    let ix = Math.floor((center.x - radius) / ISLET_CELL);
    ix <= Math.floor((center.x + radius) / ISLET_CELL);
    ix++
  ) {
    for (
      let iy = Math.floor((center.y - radius) / ISLET_CELL);
      iy <= Math.floor((center.y + radius) / ISLET_CELL);
      iy++
    ) {
      const isle = isletInCell(ix, iy)
      if (isle && (isle.x - center.x) ** 2 + (isle.y - center.y) ** 2 <= radius * radius) out.push(isle)
    }
  }
  return out
}
/** The actual grass lip around the navigable rock. Lower ledges taper inward. */
export function isletOutline(isle: SkyIslet): readonly Point[] {
  const existing = outlines.get(isle)
  if (existing) return existing
  const turn = islandNoise(isle.seed, 6) * TAU,
    aspect = 0.58 + 0.32 * islandNoise(isle.seed, 7),
    n = 11 + Math.floor(islandNoise(isle.seed, 8) * 5)
  const points = Array.from({ length: n }, (_, i) => {
    const a = (TAU * i) / n,
      r = isle.radius * (0.75 + 0.25 * islandNoise(isle.seed, 30 + i))
    const x = r * Math.cos(a),
      y = r * aspect * Math.sin(a)
    return {
      x: isle.x + x * Math.cos(turn) - y * Math.sin(turn),
      y: isle.y + x * Math.sin(turn) + y * Math.cos(turn),
    }
  })
  outlines.set(isle, points)
  return points
}

/** Slide against the polygon the captain can see, with the same ship clearance as the large ports. */
export function clearIslets(ship: Point & { vx: number; vy: number }) {
  for (const isle of skyIsletsNear(ship, 81)) {
    const poly = isletOutline(isle)
    let inside = false,
      distance = Infinity,
      nx = 0,
      ny = 0
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j],
        b = poly[i],
        dx = b.x - a.x,
        dy = b.y - a.y
      if (a.y > ship.y !== b.y > ship.y && ship.x < a.x + ((ship.y - a.y) * dx) / dy) inside = !inside
      const t = Math.max(0, Math.min(1, ((ship.x - a.x) * dx + (ship.y - a.y) * dy) / (dx * dx + dy * dy)))
      const x = ship.x - a.x - t * dx,
        y = ship.y - a.y - t * dy,
        d = Math.hypot(x, y)
      if (d < distance) {
        distance = d
        nx = d > 1e-7 ? x / d : dy / Math.hypot(dx, dy)
        ny = d > 1e-7 ? y / d : -dx / Math.hypot(dx, dy)
      }
    }
    if (!inside && distance >= 9) continue
    if (inside && distance > 1e-7) {
      nx = -nx
      ny = -ny
    }
    const push = inside ? distance + 9 : 9 - distance
    ship.x += nx * push
    ship.y += ny * push
    const closing = Math.min(0, ship.vx * nx + ship.vy * ny)
    ship.vx -= closing * nx
    ship.vy -= closing * ny
  }
}

/** Begin a shallow detour before a hull reaches the near side of an islet. */
export function isletCourse(from: Point, to: Point): Point {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    d = Math.hypot(dx, dy)
  if (d < 1) return to
  const hx = dx / d,
    hy = dy / d
  let first = Infinity,
    via = to
  for (const isle of skyIsletsNear(from, 235)) {
    const x = isle.x - from.x,
      y = isle.y - from.y,
      ahead = x * hx + y * hy,
      side = x * -hy + y * hx,
      r = isle.radius + 27
    if (ahead <= 0 || ahead >= Math.min(d, first) || Math.abs(side) >= r) continue
    first = ahead
    const sign = side < 0 ? 1 : -1
    via = { x: isle.x - hy * sign * r, y: isle.y + hx * sign * r }
  }
  return via
}
