import { GUN_POSITIONS } from './drill'

export interface BattleOpponent {
  name: string
  cannons: number
  hull: number
  crew: number
}

export const WATCH_CUTTER: BattleOpponent = { name: 'Lark', cannons: 4, hull: 82, crew: 8.3 }
export const SKY = { width: 940, height: 460 }
export const SHOT_SPEED = 310
const SHOT_LIFETIME = 2.05
const TAU = Math.PI * 2
export const STILL_AIR = { x: 0, y: 0 } as const
// Chart units per second. Wind affects a drifting hull and a fast round on different time scales.
const HULL_DRIFT = 19
const SHOT_DRIFT = 32

export type Side = 'port' | 'starboard'
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

export function sideBearing(ship: { heading: number }, side: Side): number {
  return ship.heading + (side === 'port' ? -Math.PI / 2 : Math.PI / 2)
}

export function closestSide(ship: Vessel, target: Point): Side {
  return wrapAngle(angleBetween(ship, target) - ship.heading) < 0 ? 'port' : 'starboard'
}

export function armedSide(ship: Vessel, target: Point): Side {
  const side = closestSide(ship, target)
  return ship.guns.some((gun) => gun.side === side) ? side : ship.guns[0]?.side ?? side
}

export function armamentLabel(cannons: number): string {
  if (cannons === 1) return '1 port gun'
  if (cannons === 2) return '2 guns, one on each rail'
  if (cannons === 4) return '4 guns, two on each rail'
  const stations = GUN_POSITIONS.slice(0, cannons)
  const port = stations.filter(gun => gun.side === 'port').length
  return `${stations.length} guns, ${port} port and ${stations.length - port} starboard`
}

export function buildOpponent(pos: Point, heading: number, profile: BattleOpponent): Vessel {
  const ship = buildShip(pos, heading, 0, 0, undefined, false, profile.cannons)
  ship.maxHull = ship.hull = profile.hull
  return ship
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

export function moveShip(ship: Vessel, helm: number, dt: number, wind: Point = STILL_AIR): void {
  const cruiseSpeed = [0, 37, 63, 94][ship.throttle] ?? 0
  const across = -Math.sin(ship.heading) * wind.x + Math.cos(ship.heading) * wind.y
  const turnTarget = helm * (ship.throttle === 3 ? 1.04 : 1.32) + across * 0.065
  const turnResponse = 1 - Math.exp(-dt * 3.3)
  ship.angularSpeed += (turnTarget - ship.angularSpeed) * turnResponse
  ship.heading = wrapAngle(ship.heading + ship.angularSpeed * dt)
  const acceleration = 1 - Math.exp(-dt * 1.12)
  ship.vx += (Math.cos(ship.heading) * cruiseSpeed + wind.x * HULL_DRIFT - ship.vx) * acceleration
  ship.vy += (Math.sin(ship.heading) * cruiseSpeed + wind.y * HULL_DRIFT - ship.vy) * acceleration
  ship.x += ship.vx * dt
  ship.y += ship.vy * dt
  ship.heel += (ship.angularSpeed * 0.7 - ship.heel) * turnResponse
  ship.guns.forEach((gun) => {
    gun.cooldown = Math.max(0, gun.cooldown - dt)
  })
}

export function steerRaider(
  enemy: Vessel,
  player: Vessel,
  area: { width: number; height: number; top: number; bottom: number },
  pursuing: boolean,
  dt: number,
  wind: Point,
): Side {
  const range = Math.hypot(enemy.x - player.x, enemy.y - player.y)
  const bearing = angleBetween(enemy, player)
  const side = armedSide(enemy, player)
  const rail = side === 'port' ? -1 : 1
  const gun = enemy.guns.find(g => g.side === side && !g.cooldown) ?? enemy.guns.find(g => g.side === side)!
  let desired = headingForBroadside(enemy, gun, raiderLookout(enemy, player))
  if (range > 325 || pursuing) desired = bearing - rail * 0.35
  if (range < 110) desired = bearing + Math.PI
  if (enemy.x < 68 || enemy.x > area.width - 68 || enemy.y < area.top + 43 || enemy.y > area.bottom - 43)
    desired = angleBetween(enemy, { x: area.width / 2, y: area.height / 2 })
  enemy.throttle = range > 325 || pursuing ? 2 : 1
  const helm = Math.max(-1, Math.min(1, wrapAngle(desired - enemy.heading) * 1.7))
  moveShip(enemy, helm, dt, wind)
  enemy.x = Math.max(30, Math.min(area.width - 30, enemy.x))
  enemy.y = Math.max(area.top + 20, Math.min(area.bottom - 20, enemy.y))
  return side
}

export function localPoint(ship: Point & { heading: number }, forward: number, lateral: number): Point {
  const c = Math.cos(ship.heading),
    s = Math.sin(ship.heading)
  return { x: ship.x + forward * c - lateral * s, y: ship.y + forward * s + lateral * c }
}

type HullPose = Point & { heading: number }

function stationOffset(gun: Gun): number {
  return gun.station === 0 ? 11 : -12
}

export function gunMuzzle(ship: HullPose, gun: Gun): Point {
  return localPoint(ship, stationOffset(gun), gun.side === 'port' ? -12 : 12)
}

// A helm order only. Neither the muzzle nor a round in flight receives a target.
export function headingForBroadside(ship: Vessel, gun: Gun, point: Point): number {
  const range = Math.max(1, Math.hypot(point.x - ship.x, point.y - ship.y))
  const offset = Math.acos(Math.max(-1, Math.min(1, stationOffset(gun) / range)))
  return angleBetween(ship, point) + (gun.side === 'port' ? offset : -offset)
}

export function raiderLookout(enemy: Vessel, player: Vessel): HullPose {
  const time = Math.min(1.2, Math.hypot(enemy.x - player.x, enemy.y - player.y) / SHOT_SPEED)
  return { x: player.x + player.vx * time, y: player.y + player.vy * time, heading: player.heading }
}

// Does the straight muzzle line cross the oriented hull? Used by the practice
// instructor and the raider's trigger decision, never to change a round's path.
export function gunBearsOn(ship: Vessel, gun: Gun, target: HullPose): boolean {
  const muzzle = gunMuzzle(ship, gun)
  const bearing = sideBearing(ship, gun.side)
  const dx = Math.cos(bearing), dy = Math.sin(bearing)
  const end = { x: muzzle.x + SHOT_SPEED * SHOT_LIFETIME * dx, y: muzzle.y + SHOT_SPEED * SHOT_LIFETIME * dy }
  const a = localPoint(target, -29, 0), b = localPoint(target, 33, 0)
  const offsetA = (a.y - muzzle.y) * dx - (a.x - muzzle.x) * dy
  const offsetB = (b.y - muzzle.y) * dx - (b.x - muzzle.x) * dy
  if (offsetA * offsetB < 0) {
    const fraction = offsetA / (offsetA - offsetB)
    const along = (a.x + fraction * (b.x - a.x) - muzzle.x) * dx + (a.y + fraction * (b.y - a.y) - muzzle.y) * dy
    if (along >= 0 && along <= SHOT_SPEED * SHOT_LIFETIME) return true
  }
  return distanceToSegment(a, muzzle, end) <= 15 || distanceToSegment(b, muzzle, end) <= 15 ||
    distanceToSegment(muzzle, a, b) <= 15 || distanceToSegment(end, a, b) <= 15
}

export function discharge(ship: Vessel, gun: Gun, tier: number): Shot | null {
  if (gun.cooldown > 0) return null
  gun.cooldown = gun.reload
  const muzzle = gunMuzzle(ship, gun)
  const bearing = sideBearing(ship, gun.side)
  const vx = Math.cos(bearing), vy = Math.sin(bearing)
  ship.vx -= vx * 4
  ship.vy -= vy * 4
  ship.angularSpeed += (gun.station === 0 ? -1 : 1) * (gun.side === 'port' ? -0.035 : 0.035)
  return {
    ...muzzle,
    vx: vx * SHOT_SPEED,
    vy: vy * SHOT_SPEED,
    damage: 15 + tier * 3,
    lifetime: SHOT_LIFETIME,
  }
}

export function moveShot(shot: Shot, dt: number, wind: Point = STILL_AIR): void {
  const ax = wind.x * SHOT_DRIFT,
    ay = wind.y * SHOT_DRIFT
  shot.x += shot.vx * dt + 0.5 * ax * dt * dt
  shot.y += shot.vy * dt + 0.5 * ay * dt * dt
  shot.vx += ax * dt
  shot.vy += ay * dt
  shot.lifetime -= dt
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
