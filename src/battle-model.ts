import { FITTED_CANNONS, GUN_POSITIONS, stationOffset } from './drill'

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
  salvoIn?: number
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
  if (cannons === 6) return '6 guns, three on each rail'
  if (cannons > 6 && cannons % 2 === 0) return `${cannons} guns, ${cannons / 2} on each rail`
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
  cannons: number = FITTED_CANNONS[Math.min(gunLevel, FITTED_CANNONS.length - 1)],
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

const ENGINE_SPEED = [0, 37, 63, 94]
const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

export function moveShip(ship: Vessel, helm: number, dt: number, wind: Point = STILL_AIR): void {
  const cruise = ENGINE_SPEED[ship.throttle] ?? 0
  const windX = wind.x * HULL_DRIFT, windY = wind.y * HULL_DRIFT
  const airX = ship.vx - windX, airY = ship.vy - windY
  const forward = Math.max(0, Math.cos(ship.heading) * airX + Math.sin(ship.heading) * airY)
  // At low speed the crew can pivot the ship. The rudder bites once underway;
  // at full ahead the same order describes a much wider arc.
  const speedFraction = clampUnit((forward - ENGINE_SPEED[1]) / (ENGINE_SPEED[3] - ENGINE_SPEED[1]))
  const turnRate = 1.05 + .30 * clampUnit(forward / ENGINE_SPEED[1]) - .48 * speedFraction
  const crosswind = -Math.sin(ship.heading) * wind.x + Math.cos(ship.heading) * wind.y
  const targetYaw = Math.max(-1, Math.min(1, helm)) * turnRate + crosswind * .065
  const yawResponse = Math.abs(helm) < .01 ? 4.8 : 2.7
  const yawGain = -Math.expm1(-yawResponse * dt)
  const yawChange = targetYaw * dt + (ship.angularSpeed - targetYaw) * yawGain / yawResponse
  ship.angularSpeed += (targetYaw - ship.angularSpeed) * yawGain

  // Resolve momentum in the turning hull's frame. The engine builds forward
  // speed gently; the keel damps sideways motion faster, leaving a short skid.
  const midHeading = ship.heading + yawChange * .5
  const bowX = Math.cos(midHeading), bowY = Math.sin(midHeading)
  const along = bowX * airX + bowY * airY
  const normal = -bowY * airX + bowX * airY
  const thrust = cruise + (along - cruise) * Math.exp(-1.12 * dt)
  const slip = normal * Math.exp(-4.5 * dt)
  const vx = bowX * thrust - bowY * slip + windX
  const vy = bowY * thrust + bowX * slip + windY
  ship.x += (ship.vx + vx) * .5 * dt
  ship.y += (ship.vy + vy) * .5 * dt
  ship.vx = vx
  ship.vy = vy
  ship.heading = wrapAngle(ship.heading + yawChange)

  // Signed roll follows lateral acceleration, not the key. A pivot at rest
  // stays level and a coasting ship keeps its bank until the turn rolls out.
  const bank = Math.atan(ship.angularSpeed * forward / 118)
  ship.heel += (bank - ship.heel) * -Math.expm1(-dt * 4.4)
  for (const gun of ship.guns) gun.cooldown = gun.cooldown <= dt + 1e-9 ? 0 : gun.cooldown - dt
}

// Lead the rollout when following a course so the bow settles on its heading.
export function helmForHeading(ship: Vessel, desired: number): number {
  const error = wrapAngle(desired - ship.heading)
  return Math.max(-1, Math.min(1, error * 2.35 - ship.angularSpeed * .63))
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
  moveShip(enemy, helmForHeading(enemy, desired), dt, wind)
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

export function gunMuzzle(ship: HullPose, gun: Gun): Point {
  return localPoint(ship, stationOffset(gun.station), gun.side === 'port' ? -12 : 12)
}

// A helm order only. Neither the muzzle nor a round in flight receives a target.
export function headingForBroadside(ship: Vessel, gun: Gun, point: Point): number {
  const range = Math.max(1, Math.hypot(point.x - ship.x, point.y - ship.y))
  const offset = Math.acos(Math.max(-1, Math.min(1, stationOffset(gun.station) / range)))
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

// Reserve only the barrels loaded at the moment of the order. Each barrel's
// own countdown is saved on the vessel. Its muzzle pose is sampled when it fires.
export function fireBroadside(ship: Vessel, side: Side, tier: number): Shot[] {
  const rail = ship.guns.filter(gun => gun.side === side)
  let loaded = rail.filter(gun => gun.cooldown <= 0 && gun.salvoIn === undefined)
  if (!loaded.length) return []
  if (loaded.length > 3) {
    loaded.sort((a, b) => stationOffset(b.station) - stationOffset(a.station))
    const third = Math.ceil(loaded.length / 3)
    const bow = loaded.slice(0, third)
    const middle = loaded.slice(third, loaded.length - third)
    const stern = loaded.slice(loaded.length - third).reverse()
    loaded = []
    // Stagger ports within each third so a stationary ship's volley still
    // fills the width of the rail instead of drawing three diagonal rows.
    for (const rank of [0, 4, 2, 6, 1, 5, 3, 7]) {
      if (rank >= third) continue
      loaded.push(bow[rank], stern[rank])
      if (middle[rank]) loaded.push(middle[rank])
    }
  }
  const shots: Shot[] = []
  let tail = Math.max(0, ...rail.map(gun => gun.cooldown))
  for (const [i, gun] of loaded.entries()) {
    tail += gun.reload / rail.length
    gun.cooldown = tail
    const delay = salvoDelay(i, loaded.length)
    if (delay > 0) gun.salvoIn = delay
    else shots.push(launchRound(ship, gun, tier))
  }
  return shots
}

const GROUP_ENDS = [.10, .19, .35, .47, .55, .73, .86, 1]
const CADENCE = [0, .10, .22, .38, .49, .65, .82, 1]
function salvoDelay(index: number, count: number): number {
  if (count <= 3) return index * .07
  const phase = index / (count - 1)
  const group = GROUP_ENDS.findIndex(end => phase <= end)
  const span = Math.min(.86, (count - 1) * .06)
  const first = group ? Math.floor(GROUP_ENDS[group - 1] * (count - 1)) + 1 : 0
  // Neighbouring ports in a group fire just apart. The last gun closes its beat.
  const beatOffset = group === CADENCE.length - 1 ? index - (count - 1) : index - first
  return CADENCE[group] * span + beatOffset * .016
}

export function advanceBroadside(ship: Vessel, dt: number, tier: number): Shot[] {
  const shots: Shot[] = []
  for (const gun of ship.guns) {
    if (gun.salvoIn === undefined) continue
    if (gun.salvoIn > dt + 1e-9) gun.salvoIn -= dt
    else {
      delete gun.salvoIn
      shots.push(launchRound(ship, gun, tier))
    }
  }
  return shots
}

function launchRound(ship: Vessel, gun: Gun, tier: number): Shot {
  const muzzle = gunMuzzle(ship, gun)
  const bearing = sideBearing(ship, gun.side)
  const vx = Math.cos(bearing), vy = Math.sin(bearing)
  const massFactor = Math.min(1, 6 / ship.guns.length)
  ship.vx -= vx * 4 * massFactor
  ship.vy -= vy * 4 * massFactor
  ship.angularSpeed += -massFactor * Math.sign(stationOffset(gun.station)) * (gun.side === 'port' ? -0.035 : 0.035)
  return {
    ...muzzle,
    vx: vx * SHOT_SPEED,
    vy: vy * SHOT_SPEED,
    damage: 15 + Math.min(tier, 5) * 3,
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
