import { GUN_POSITIONS } from './drill'
export const SKY = { width: 940, height: 460 }
export const GUN_ARC = Math.PI * 0.31
export const SHOT_SPEED = 310
const TAU = Math.PI * 2

export type Side = 'port' | 'starboard'
export type DuelOutcome = 'victory' | 'defeat' | 'escaped' | 'boarded'
export interface Point {
  x: number
  y: number
}
export interface Gun {
  side: Side
  station: number
  cooldown: number
  reload: number
}
export interface Vessel extends Point {
  heading: number
  angularSpeed: number
  vx: number
  vy: number
  throttle: number
  heel: number
  hull: number
  maxHull: number
  guns: Gun[]
}
export interface Shot extends Point {
  vx: number
  vy: number
  damage: number
  lifetime: number
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function wrapAngle(radians: number): number {
  return ((((radians + Math.PI) % TAU) + TAU) % TAU) - Math.PI
}

export function sideBearing(ship: Vessel, side: Side): number {
  return ship.heading + (side === 'port' ? -Math.PI / 2 : Math.PI / 2)
}

export function inArc(ship: Vessel, side: Side, target: Point): boolean {
  return Math.abs(wrapAngle(angleBetween(ship, target) - sideBearing(ship, side))) <= GUN_ARC
}

export function closestSide(ship: Vessel, target: Point): Side {
  return wrapAngle(angleBetween(ship, target) - ship.heading) < 0 ? 'port' : 'starboard'
}

export function buildShip(
  pos: Point,
  heading: number,
  gunLevel: number,
  hullLevel: number,
  remainingHull?: number,
  quickGunnery = false,
  cannons = Math.min(4, 1 + gunLevel),
): Vessel {
  const reload = Math.max(2.1, 4.2 - gunLevel * 0.26) * (quickGunnery ? 0.8 : 1)
  const guns: Gun[] = GUN_POSITIONS.slice(0, cannons).map(({ side, station }) => ({
    side,
    station,
    cooldown: 0,
    reload,
  }))
  const maxHull = 100 + 25 * hullLevel
  return {
    ...pos,
    heading,
    angularSpeed: 0,
    vx: 0,
    vy: 0,
    throttle: 1,
    heel: 0,
    hull: Math.min(maxHull, Math.max(1, remainingHull ?? maxHull)),
    maxHull,
    guns,
  }
}

export function moveShip(ship: Vessel, helm: number, dt: number): void {
  const cruiseSpeed = [0, 37, 63, 94][ship.throttle] ?? 0
  const turnTarget = helm * (ship.throttle === 3 ? 1.04 : 1.32)
  const turnResponse = 1 - Math.exp(-dt * 3.3)
  ship.angularSpeed += (turnTarget - ship.angularSpeed) * turnResponse
  ship.heading = wrapAngle(ship.heading + ship.angularSpeed * dt)
  const acceleration = 1 - Math.exp(-dt * 1.12)
  ship.vx += (Math.cos(ship.heading) * cruiseSpeed - ship.vx) * acceleration
  ship.vy += (Math.sin(ship.heading) * cruiseSpeed - ship.vy) * acceleration
  ship.x += ship.vx * dt
  ship.y += ship.vy * dt
  ship.heel += (ship.angularSpeed * 0.7 - ship.heel) * turnResponse
  ship.guns.forEach((gun) => {
    gun.cooldown = Math.max(0, gun.cooldown - dt)
  })
}

export function localPoint(ship: Vessel, forward: number, lateral: number): Point {
  const c = Math.cos(ship.heading),
    s = Math.sin(ship.heading)
  return { x: ship.x + forward * c - lateral * s, y: ship.y + forward * s + lateral * c }
}

export function discharge(ship: Vessel, gun: Gun, target: Point, tier: number, aimError = 0): Shot | null {
  if (gun.cooldown > 0) return null
  gun.cooldown = gun.reload
  const muzzle = localPoint(ship, gun.station === 0 ? 11 : -12, gun.side === 'port' ? -12 : 12)
  const bearing = sideBearing(ship, gun.side)
  const aim = inArc(ship, gun.side, target) ? angleBetween(muzzle, target) : bearing
  const direction = aim + aimError
  const vx = Math.cos(direction),
    vy = Math.sin(direction)
  ship.vx -= vx * 4
  ship.vy -= vy * 4
  ship.angularSpeed += (gun.station === 0 ? -1 : 1) * (gun.side === 'port' ? -0.035 : 0.035)
  return {
    ...muzzle,
    vx: vx * SHOT_SPEED + ship.vx * 0.22,
    vy: vy * SHOT_SPEED + ship.vy * 0.22,
    damage: 15 + tier * 3,
    lifetime: 2.05,
  }
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y
  const projected = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)
  const t = Math.max(0, Math.min(1, projected))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

export function hitsShip(point: Point, ship: Vessel): boolean {
  return distanceToSegment(point, localPoint(ship, -29, 0), localPoint(ship, 33, 0)) <= 15
}

export function boardingContact(a: Vessel, b: Vessel): boolean {
  if (Math.hypot(a.x - b.x, a.y - b.y) > 96) return false
  // The stations span the projected deck, including a schooner's long bow and narrow beam.
  return [-33, -17, 0, 17, 35].some((f) => {
    const station = localPoint(a, f, 0)
    return distanceToSegment(station, localPoint(b, -29, 0), localPoint(b, 33, 0)) < 24
  })
}

export function boardingOdds(crew: number, skill: number, player: Vessel, enemy: Vessel): number {
  const force = Math.max(0.1, crew * skill) * (0.8 + (0.2 * player.hull) / player.maxHull)
  const raiders = 8.3 * (0.53 + (0.47 * enemy.hull) / enemy.maxHull)
  return Math.max(0.05, Math.min(0.95, 0.5 + ((force - raiders) / (force + raiders)) * 1.3))
}
