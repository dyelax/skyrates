import { localPoint, type Point, type Vessel } from './battle-model'
import type { BattleEnding, ContactClock } from './battle-state'

const RAIL_SPAN = 24
const CONTACT_EPSILON = 0.00001
export const PHYSICS_STEP = 1 / 120

function closestPoint(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

// Two oriented capsules. Use the ends' projections for the shortest distance,
// plus the crossing point when a restored or tightly turning pair overlaps.
export function hullContact(a: Vessel, b: Vessel) {
  const a0 = localPoint(a, -29, 0), a1 = localPoint(a, 33, 0)
  const b0 = localPoint(b, -29, 0), b1 = localPoint(b, 33, 0)
  const pairs = [
    [a0, closestPoint(a0, b0, b1)], [a1, closestPoint(a1, b0, b1)],
    [closestPoint(b0, a0, a1), b0], [closestPoint(b1, a0, a1), b1],
  ]
  const ax = a1.x - a0.x, ay = a1.y - a0.y
  const bx = b1.x - b0.x, by = b1.y - b0.y
  const det = ax * by - ay * bx
  if (Math.abs(det) > CONTACT_EPSILON) {
    const dx = b0.x - a0.x, dy = b0.y - a0.y
    const t = (dx * by - dy * bx) / det, u = (dx * ay - dy * ax) / det
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const crossing = { x: a0.x + t * ax, y: a0.y + t * ay }
      pairs.push([crossing, crossing])
    }
  }
  let [p, q] = pairs[0], separation = Math.hypot(q.x - p.x, q.y - p.y)
  for (const [nearA, nearB] of pairs.slice(1)) {
    const distance = Math.hypot(nearB.x - nearA.x, nearB.y - nearA.y)
    if (distance < separation) { p = nearA; q = nearB; separation = distance }
  }
  const centerDistance = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = separation > CONTACT_EPSILON ? (q.x - p.x) / separation : (centerDistance ? (b.x - a.x) / centerDistance : 1)
  const ny = separation > CONTACT_EPSILON ? (q.y - p.y) / separation : (centerDistance ? (b.y - a.y) / centerDistance : 0)
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, nx, ny, gap: separation - RAIL_SPAN }
}

export function collisionDamage(a: Vessel, b: Vessel, nx: number, ny: number) {
  const vx = a.vx - b.vx, vy = a.vy - b.vy
  const inward = Math.max(0, vx * nx + vy * ny), tangential = vx * ny - vy * nx
  const total = 20 * ((inward / 94) ** 2 + 0.01 * (tangential / 94) ** 2)
  const bowA = Math.cos(a.heading) * nx + Math.sin(a.heading) * ny
  const bowB = -Math.cos(b.heading) * nx - Math.sin(b.heading) * ny
  const alignment = Math.max(0, bowA) * (1 - Math.abs(bowB)) - Math.max(0, bowB) * (1 - Math.abs(bowA))
  const fraction = inward / (Math.hypot(vx, vy) || 1)
  const square = Math.min(1, Math.max(0, (fraction - .35) / .65))
  const aDamage = total * (.5 - .25 * square * alignment)
  return { aDamage, bDamage: total - aDamage, inward }
}

export interface CrewPair { player: number; enemy: number }

export function exchangeBlows(crew: CrewPair, seconds: number): void {
  if (crew.player <= 0 || crew.enemy <= 0 || seconds <= 0) return
  const a = crew.player + 1, b = crew.enemy + 1
  // Stop exactly when the weaker crew yields. For x=min(a,b), y=max(a,b),
  // x cosh(k) - y sinh(k) = 1 at exp(k) = (x+y)/(1+sqrt(1+y²-x²)).
  const weaker = Math.min(a, b), stronger = Math.max(a, b)
  const end = Math.log((a + b) / (1 + Math.sqrt(1 + (stronger - weaker) * (stronger + weaker))))
  const k = Math.min(.12 * seconds, end)
  const c = Math.cosh(k), s = Math.sinh(k)
  crew.player = k >= end && a <= b ? 0 : Math.max(0, a * c - b * s - 1)
  crew.enemy = k >= end && b <= a ? 0 : Math.max(0, b * c - a * s - 1)
}

export function contactStep(a: Vessel, b: Vessel, crew: CrewPair, clock: ContactClock, dt: number) {
  const gap = hullContact(a, b)
  let damage = 0
  const touching = gap.gap <= CONTACT_EPSILON
  if (!touching) {
    clock.clearSeconds = gap.gap >= 8 ? Math.min(.4, clock.clearSeconds + dt) : 0
    if (clock.clearSeconds >= .4 - 1e-9) clock.armed = true
  } else {
    const { aDamage, bDamage, inward } = collisionDamage(a, b, gap.nx, gap.ny)
    if (clock.armed) {
      damage = Math.min(a.hull, aDamage) + Math.min(b.hull, bDamage)
      a.hull = Math.max(0, a.hull - aDamage)
      b.hull = Math.max(0, b.hull - bDamage)
    }
    clock.armed = false
    clock.clearSeconds = 0
    // Equal masses: remove inward relative motion, retain slide and outward steering.
    const separate = Math.max(0, -gap.gap) / 2
    a.x -= gap.nx * separate; a.y -= gap.ny * separate
    b.x += gap.nx * separate; b.y += gap.ny * separate
    a.vx -= gap.nx * inward / 2; a.vy -= gap.ny * inward / 2
    b.vx += gap.nx * inward / 2; b.vy += gap.ny * inward / 2
    if (a.hull > 0 && b.hull > 0) exchangeBlows(crew, dt)
  }
  return { touching, damage, contact: gap }
}

export function combatEnding(a: Vessel, b: Vessel, crew: CrewPair): BattleEnding | null {
  if (!a.hull && !b.hull) return 'mutualWreck'
  if (!a.hull) return 'defeat'
  if (!b.hull) return 'victory'
  if (!crew.player && !crew.enemy) return 'withdrawn'
  if (!crew.player) return 'yielded'
  if (!crew.enemy) return 'boarded'
  return null
}
