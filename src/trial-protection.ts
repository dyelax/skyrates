import {
  angleBetween, armedSide, buildOpponent, buildShip, gunBearsOn, gunMuzzle,
  headingForBroadside, helmForHeading, hitsShip, moveShip, raiderLookout, steerRaider,
  type BattleOpponent, type Point, type Side, type Vessel,
} from './battle-model'
import type { BattleEnding, ContactClock } from './battle-state'
import { contactStep } from './contact-combat'
import { ESCORT_HULL, escortStep } from './merchant-escort'
import { RAIDER_PROFILES } from './raiders'

export type TrialScenario = 'prize-protection' | 'merchant-escort'
export interface TrialProtectionReport {
  scenario: TrialScenario
  status: 'afloat' | 'lost' | 'escaped'
  hull: number
  maxHull: number
  legs: number
}
type Role = 'hostile' | 'struck' | 'merchant' | 'wreck'
interface Participant {
  name: string
  ship: Vessel
  crew: number
  maxCrew: number
  role: Role
  contact: ContactClock
  delay: number
  aim: number
}
type Area = { width: number; top: number; bottom: number; height: number }
type Impact = ReturnType<typeof contactStep>
type Order = (ship: Vessel, side: Side) => void

const freshContact = (): ContactClock => ({ armed: true, clearSeconds: .4 })
const middle = (area: Area) => (area.top + area.bottom) / 2
const bound = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const warningTime = 2.1

function participant(name: string, ship: Vessel, crew: number, role: Role): Participant {
  return { name, ship, crew, maxCrew: crew, role, delay: 1.5, aim: 0, contact: freshContact() }
}

// The tester owns these extra vessels. The shared scene still advances the
// captain, rounds, real cannon queues and impact effects using the usual rules.
export class TrialProtection {
  lead: Participant
  extra: Participant
  exit?: Point
  warning?: { muzzle: Point; progress: number }
  prize?: Participant
  completed = 0
  report?: TrialProtectionReport
  private leg: 1 | 2 = 1
  private readonly limping?: Vessel

  constructor(readonly scenario: TrialScenario, player: Vessel, selected: BattleOpponent, area: Area) {
    const y = middle(area)
    const enemy = buildOpponent({ x: 420, y }, -Math.PI / 2, selected)
    this.lead = participant(selected.name, enemy, selected.crew, 'hostile')
    if (scenario === 'prize-protection') {
      Object.assign(player, { x: 306, y, heading: 0, throttle: 0 })
      // Both raiders are active from the first tick. A battered lead ship
      // gives even the starter a chance to take colors before the wing arrives.
      enemy.hull = 26
      this.lead.crew = 2.4
      this.limping = enemy
      const wing = buildOpponent({ x: 655, y: y - 72 }, Math.PI / 2, RAIDER_PROFILES[1])
      this.extra = participant('Wing raider', wing, RAIDER_PROFILES[1].crew, 'hostile')
    } else {
      const merchant = buildShip({ x: 150, y }, 0, 0, 0, undefined, false, 0)
      merchant.hull = merchant.maxHull = ESCORT_HULL
      this.extra = participant('Merchant', merchant, 0, 'merchant')
      this.placeEscort(player, area)
    }
  }

  private placeEscort(player: Vessel, area: Area) {
    const y = middle(area)
    Object.assign(player, { x: 250, y: y + 62, heading: 0, vx: 0, vy: 0, angularSpeed: 0, heel: 0, throttle: 1 })
    Object.assign(this.extra.ship, { x: 150, y, heading: 0, vx: 0, vy: 0, throttle: 1, angularSpeed: 0, heel: 0 })
    Object.assign(this.lead.ship, { x: 365, y: y - 65, heading: 0, throttle: 0 })
    this.exit = { x: area.width - 62, y }
    this.extra.contact = freshContact()
  }

  get protectedVessel() {
    return this.scenario === 'merchant-escort' ? this.extra : this.prize
  }

  closestHostile(player: Vessel) {
    return [this.lead, this.extra].filter(actor => actor.role === 'hostile')
      .sort((a, b) => Math.hypot(a.ship.x - player.x, a.ship.y - player.y)
        - Math.hypot(b.ship.x - player.x, b.ship.y - player.y))[0]?.ship
  }

  stepFlight(player: Vessel, area: Area, wind: Point, dt: number, fire: Order) {
    this.warning = undefined
    if (this.extra.role === 'merchant' && this.exit) {
      const ship = this.extra.ship
      ship.throttle = 1
      moveShip(ship, helmForHeading(ship, angleBetween(ship, this.exit)), dt, wind)
    }
    for (const actor of [this.lead, this.extra]) {
      const ship = actor.ship
      if (actor.role === 'struck') {
        ship.throttle = 0
        moveShip(ship, 0, dt, wind)
      }
      if (actor.role !== 'hostile') continue
      const protectedShip = this.protectedVessel?.ship
      const quarry = protectedShip && protectedShip.hull > 0 ? protectedShip : player
      actor.delay -= dt
      const side = armedSide(ship, quarry)
      const gun = ship.guns.find(g => g.side === side && !g.cooldown) ?? ship.guns.find(g => g.side === side)!
      const predicted = raiderLookout(ship, quarry)
      const distance = Math.hypot(quarry.x - ship.x, quarry.y - ship.y)
      if (protectedShip || ship === this.limping) {
        const approach = protectedShip && distance > 340
        ship.throttle = approach ? 2 : 0
        const heading = approach ? angleBetween(ship, quarry) : headingForBroadside(ship, gun, predicted)
        moveShip(ship, helmForHeading(ship, heading), dt, wind)
      } else steerRaider(ship, player, area, false, dt, wind)
      const canFire = distance < 510 && actor.delay <= 0 && !gun.cooldown
      if (quarry !== player && canFire && distance < 430) {
        actor.aim += dt
        this.warning = { muzzle: gunMuzzle(ship, gun), progress: Math.min(1, actor.aim / warningTime) }
      } else actor.aim = 0
      if (canFire && (quarry === player || actor.aim >= warningTime) && gunBearsOn(ship, gun, predicted)) {
        fire(ship, side)
        actor.aim = 0
        actor.delay = 1.6
      }
      ship.x = bound(ship.x, 26, area.width - 26)
      ship.y = bound(ship.y, area.top + 23, area.bottom - 23)
    }
  }

  shotTarget(point: Point, from: Point, enemy: boolean, player: Vessel, source?: Vessel) {
    const protectedShip = this.protectedVessel?.ship
    const hulls = enemy ? [player, ...(protectedShip ? [protectedShip] : [])] : [this.lead.ship, this.extra.ship]
    // Across a short simulation step the first live hull on the round's path
    // intercepts it, including a captain physically screening the prize.
    const struck = hulls.filter(ship => ship !== source && ship.hull > 0 && hitsShip(point, ship))
    if (struck.length < 2) return struck[0]
    function entry(ship: Vessel) {
      if (hitsShip(from, ship)) return 0
      let outside = 0, inside = 1
      for (let i = 0; i < 10; i++) {
        const t = (outside + inside) / 2
        const at = { x: from.x + (point.x - from.x) * t, y: from.y + (point.y - from.y) * t }
        if (hitsShip(at, ship)) inside = t
        else outside = t
      }
      return inside
    }
    return struck.sort((a, b) => entry(a) - entry(b))[0]
  }

  contacts(player: Vessel, strength: number, dt: number) {
    const impacts: Impact[] = []
    let touching: Vessel | undefined
    for (const actor of [this.lead, this.extra]) {
      if (!actor.ship.hull) continue
      const active = actor.role === 'hostile'
      const crew = { player: strength, enemy: active ? actor.crew : 0 }
      const hit = contactStep(player, actor.ship, crew, actor.contact, dt)
      if (hit.damage) impacts.push(hit)
      if (active) {
        actor.crew = crew.enemy
        strength = crew.player
        if (hit.touching) touching = actor.ship
      }
    }
    return { strength, touching, impacts }
  }

  private record(status: TrialProtectionReport['status']) {
    const protectedShip = this.protectedVessel?.ship
    if (protectedShip) this.report = { scenario: this.scenario, status, hull: protectedShip.hull,
      maxHull: protectedShip.maxHull, legs: this.completed }
  }

  resolve(player: Vessel, playerCrew: number, atEdge: boolean, area: Area): {
    ending?: BattleEnding; notice?: string; changed?: boolean
  } {
    if (!player.hull || !playerCrew || atEdge) {
      this.record(this.protectedVessel?.ship.hull === 0 ? 'lost' : 'escaped')
      return { ending: !player.hull ? 'defeat' : !playerCrew ? 'yielded' : 'escaped' }
    }
    for (const actor of [this.lead, this.extra]) {
      if (actor.ship.hull <= 0) actor.role = 'wreck'
      else if (actor.role === 'hostile' && actor.crew <= 0) {
        actor.role = 'struck'
        actor.ship.throttle = 0
      }
    }
    if (this.scenario === 'merchant-escort') {
      const merchant = this.extra.ship
      const arrived = Boolean(this.exit && Math.hypot(merchant.x - this.exit.x, merchant.y - this.exit.y) < 25)
      const result = escortStep(this.leg, merchant.hull, this.lead.role !== 'hostile', arrived, false)
      if (result === 'lost') { this.record('lost'); return { ending: 'defeat' } }
      if (result === 'delivered') { this.completed = 2; this.record('afloat'); return { ending: 'victory' } }
      if (result === 'next') {
        this.completed = 1
        this.leg = 2
        const enemy = buildOpponent({ x: 0, y: 0 }, 0, RAIDER_PROFILES[2])
        this.lead = participant('Corsair', enemy, RAIDER_PROFILES[2].crew, 'hostile')
        this.placeEscort(player, area)
        this.warning = undefined
        return { changed: true, notice: 'Second crossing. The merchant carries its damage forward.' }
      }
      return {}
    }
    const active = [this.lead, this.extra].filter(actor => actor.role === 'hostile')
    if (!active.length) {
      this.record(this.prize?.ship.hull ? 'afloat' : 'lost')
      return { ending: this.lead.role === 'struck' ? 'boarded' : 'victory' }
    }
    let changed = false
    if (this.lead.role !== 'hostile') {
      const previous = this.lead
      this.lead = this.extra
      this.extra = previous
      changed = true
    }
    if (!this.prize && this.extra.role === 'struck') {
      this.prize = this.extra
      this.lead.aim = 0
      this.lead.delay = Math.max(this.lead.delay, 1)
      return { changed: true, notice: 'White flag! Shield the prize or stop the remaining raider.' }
    }
    if (this.prize?.role === 'wreck' && !this.report) {
      this.record('lost')
      return { notice: 'The struck prize has gone down. A raider is still fighting.' }
    }
    return { changed }
  }
}
