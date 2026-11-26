import { battleSound } from './audio'
import type { BattleSnapshot } from './battle-state'
import type { WorldFlight, WorldPose } from './world-flight'

type Point = { x: number; y: number }
interface Hit extends Point {
  age: number
  angle: number
  power: number
}
interface Wreck {
  ship: WorldPose
  key: string
  length: number
  age: number
}
type ShipPainter = (
  ship: WorldPose,
  key: string,
  length: number,
  reduced: boolean,
  cannons: number,
  damage: number,
) => void

/** Keep terminal visuals alive after the model has settled the contact. All
 * effects are local to the canvas and the worst simultaneous event wins. */
export class WorldSkirmishFx {
  private id?: string
  private lastHull = [0, 0]
  private shots: BattleSnapshot['projectiles'] = []
  private impacts: Hit[] = []
  private wrecks: Wreck[] = []
  private shake?: Hit
  observe(flight: WorldFlight, battle?: BattleSnapshot) {
    if (!battle?.worldActor) {
      this.id = undefined
      this.shots = []
      return
    }
    const hulls = [battle.player.hull, battle.enemy.hull]
    if (this.id === battle.worldActor) {
      const opp = flight.traffic.find((a) => a.id === this.id),
        poses = [flight.player, opp?.ship]
      for (let side = 0; side < 2; side++) {
        const ship = poses[side],
          damage = this.lastHull[side] - hulls[side]
        if (!ship || damage <= 0.001) continue
        const source = this.shots
          .filter((s) => s.enemy === (side === 0))
          .sort((a, b) => Math.hypot(ship.x - a.x, ship.y - a.y) - Math.hypot(ship.x - b.x, ship.y - b.y))[0]
        const nearShot = source && Math.hypot(source.x - ship.x, source.y - ship.y) < 58
        const other = poses[1 - side] ?? ship
        const angle = nearShot ? Math.atan2(source.vy, source.vx) : Math.atan2(ship.y - other.y, ship.x - other.x)
        const hit = {
          x: ship.x - Math.cos(angle) * 15,
          y: ship.y - Math.sin(angle) * 15,
          angle,
          power: Math.min(1, damage / 16),
          age: 0,
        }
        this.impacts.push(hit)
        if (this.impacts.length > 7) this.impacts.shift()
        if (!this.shake || this.shake.age > 0.11 || hit.power > this.shake.power) {
          this.shake = { ...hit }
          battleSound(nearShot ? 'hit' : 'impact', 0.32 + 0.48 * hit.power)
        }
        if (hulls[side] <= 0) {
          this.wrecks.push({
            ship: { ...ship },
            key: side === 0 || opp?.kind === 'merchant' ? 'schooner-top' : 'raider-top',
            length: side === 0 ? 83 : 69,
            age: 0,
          })
          if (this.wrecks.length > 2) this.wrecks.shift()
          battleSound('wreck', 0.7)
        }
      }
    }
    this.id = battle.worldActor
    this.lastHull = hulls
    this.shots = [...battle.projectiles]
  }
  drift(ctx: CanvasRenderingContext2D, dt: number, reduced: boolean) {
    for (const hit of this.impacts) hit.age += dt
    for (const wreck of this.wrecks) wreck.age += dt
    this.impacts = this.impacts.filter((hit) => hit.age < 0.38)
    this.wrecks = this.wrecks.filter((wreck) => wreck.age < 0.98)
    if (!this.shake) return
    this.shake.age += dt
    if (this.shake.age > 0.2) {
      this.shake = undefined
      return
    }
    if (reduced) return
    const k = this.shake.power * (1 - this.shake.age / 0.2) ** 2 * 2.9 * Math.cos(this.shake.age * 68)
    ctx.translate(Math.cos(this.shake.angle) * k, Math.sin(this.shake.angle) * k)
  }
  draw(
    ctx: CanvasRenderingContext2D,
    project: (pt: Point) => Point,
    scale: number,
    reduced: boolean,
    drawShip: ShipPainter,
  ) {
    for (const hit of this.impacts) {
      const p = project(hit)
      ctx.save()
      ctx.globalAlpha = (1 - hit.age / 0.38) * 0.9
      ctx.fillStyle = '#ffe4a0'
      for (let i = 0; i < 5; i++) {
        const a = hit.angle + Math.PI + (i - 2) * 0.49,
          r = (reduced ? 2 : 3 + hit.age * 37) * scale * (0.55 + 0.45 * hit.power)
        ctx.beginPath()
        ctx.arc(p.x + r * Math.cos(a), p.y + r * Math.sin(a), 1.7 * scale, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    for (const w of this.wrecks) {
      const t = Math.min(1, w.age / 0.98),
        p = project(w.ship)
      ctx.save()
      ctx.globalAlpha = 1 - t * t
      if (!reduced) {
        ctx.translate(p.x, p.y + 18 * t * t * scale)
        ctx.rotate(0.39 * t)
        ctx.scale(1 - 0.46 * t, 1 - 0.46 * t)
        ctx.translate(-p.x, -p.y)
      }
      drawShip(w.ship, w.key, w.length, true, 0, 3)
      if (!reduced) {
        ctx.fillStyle = '#685344'
        for (let i = 0; i < 6; i++) {
          const a = i * 2.4
          ctx.fillRect(
            p.x + Math.cos(a) * (10 + 32 * t) * scale,
            p.y + (Math.sin(a) * (8 + 18 * t) + t * t * 16) * scale,
            4 * scale,
            2 * scale,
          )
        }
      }
      ctx.restore()
    }
  }
}
