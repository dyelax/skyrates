import type Phaser from 'phaser'
import { battleSound } from './audio'
import { damagedHull, hullDamageStage } from './battle-damage'
import type { Vessel } from './battle-model'

type Side = 'player' | 'enemy'
type Pose = Pick<Vessel, 'x' | 'y' | 'heading' | 'hull' | 'maxHull'>
interface ShipView {
  hull: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Image
}
interface Impact {
  x: number
  y: number
  nx: number
  ny: number
  damage: number
}
interface Flash extends Impact {
  shot: boolean
  age: number
  lifetime: number
  size: number
  seed: number
}
interface FallingPiece {
  image: Phaser.GameObjects.Image
  x: number
  y: number
  heading: number
  scaleX: number
  scaleY: number
  driftX: number
  driftY: number
  spin: number
}
interface Wreck {
  age: number
  pieces: FallingPiece[]
  sites: { x: number; y: number; mist: Phaser.GameObjects.Image }[]
  sunk: Side[]
  button: HTMLButtonElement
  complete: () => void
}
const SIDES: Side[] = ['player', 'enemy']
const WRECK_SECONDS = 1.65
const LAMPS = [
  { color: 0xffdf91, radius: 2.8 },
  { color: 0xe4c17b, radius: 2.3 },
  { color: 0xa97454, radius: 1.6 },
]
const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(n, high))

export function mountBattleFx(
  scene: Phaser.Scene,
  root: HTMLElement,
  views: Record<Side, ShipView>,
  vessels: Record<Side, Pose>,
) {
  const original = { player: views.player.hull.texture.key, enemy: views.enemy.hull.texture.key }
  const stage = { player: -1, enemy: -1 }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ink = scene.add.graphics().setDepth(7)
  const clouds = scene.add.graphics().setDepth(8)
  const flashes: Flash[] = []
  let poses = vessels
  let wreck: Wreck | undefined
  let elapsed = 0
  let nextShake = 0
  let shake: { x: number; y: number; power: number; at: number; length: number } | undefined

  function ships(current: Record<Side, Pose>) {
    poses = current
    for (const side of SIDES) {
      const ship = current[side]
      const next = hullDamageStage(ship.hull, ship.maxHull)
      if (stage[side] === next) continue
      stage[side] = next
      const tex = damagedHull(scene, original[side], next)
      views[side].hull.setTexture(tex)
      views[side].shadow.setTexture(tex)
    }
  }

  function strike(hit: Impact, shot: boolean) {
    if (hit.damage <= 0) return
    const dir = Math.hypot(hit.nx, hit.ny) || 1
    const size = Math.min(2.5, 0.24 + Math.sqrt(hit.damage) / 3.5)
    const flash = {
      ...hit,
      nx: hit.nx / dir,
      ny: hit.ny / dir,
      shot,
      size,
      age: 0,
      lifetime: motion.matches ? 0.18 : 0.27 + 0.09 * size,
      seed: hit.x * 0.041 + hit.y * 0.017,
    }
    if (flashes.length >= 14) flashes.shift()
    flashes.push(flash)
    if (!shot) battleSound('impact', clamp(size / 2.1, 0.1, 1))
    else battleSound('hit', clamp(size / 1.6, 0.3, 1))
    if (motion.matches || elapsed < nextShake) return
    // A fresh impulse replaces the previous one. Even a continuous barrage leaves
    // a short quiet interval; its strength and duration never accumulate.
    const length = Math.min(0.24, 0.055 + size * 0.077)
    shake = { x: flash.nx, y: flash.ny, power: Math.min(4.4, size * 1.9), at: elapsed, length }
    nextShake = elapsed + length + 0.055
  }
  const impact = (hit: Impact) => strike(hit, false)
  const cannonHit = (hit: Impact) => strike(hit, true)

  function drawFlash(f: Flash) {
    const t = f.age / f.lifetime,
      fade = 1 - t,
      x = f.x,
      y = f.y
    const expansion = motion.matches ? 0.25 : t
    const count = Math.min(12, Math.ceil(3 + f.size * 3))
    if (f.shot) {
      ink.fillStyle(0xffd897, fade * 0.85).fillCircle(x, y, Math.max(1.5, (5 - expansion * 3) * f.size))
      ink.lineStyle(1.5, 0xffa85c, fade).strokeCircle(x, y, (4 + expansion * 10) * f.size)
    } else {
      ink.lineStyle(1.8, 0xffdd9b, fade)
      ink.lineBetween(
        x - f.ny * 4 * f.size,
        y + f.nx * 4 * f.size,
        x + f.ny * 4 * f.size,
        y - f.nx * 4 * f.size,
      )
    }
    for (let i = 0; i < count; i++) {
      const angle = f.shot
        ? f.seed + i * 2.39996
        : Math.atan2(f.ny, f.nx) + Math.PI * (i % 2) + Math.sin(i * 3.1 + f.seed) * 0.85
      const dx = Math.cos(angle),
        dy = Math.sin(angle)
      const distance = f.size * (2 + expansion * (14 + 4 * (i % 4)))
      const len = f.size * (2 + (i % 3)) * (motion.matches ? 1 : fade)
      ink.lineStyle(i % 3 === 0 ? 2.5 : 1.5, i % 3 === 0 ? 0x56372b : 0xffdf9e, fade)
      ink.lineBetween(
        x + dx * distance,
        y + dy * distance,
        x + dx * (distance + len),
        y + dy * (distance + len),
      )
    }
  }

  function liftAndSmoke(side: Side) {
    if (stage[side] < 0) return
    const ship = poses[side],
      nx = Math.cos(ship.heading),
      ny = Math.sin(ship.heading)
    const x = ship.x - 25 * nx,
      y = ship.y - 25 * ny
    const lamp = LAMPS[stage[side]]
    if (lamp) {
      ink.fillStyle(lamp.color, 0.16).fillCircle(x, y, lamp.radius * 2)
      ink.fillStyle(lamp.color, 0.78).fillCircle(x, y, lamp.radius)
    }
    if (stage[side] < 2) return
    for (let i = 0; i < 3; i++) {
      const t = motion.matches ? (i + 0.5) / 3 : (elapsed * 0.64 + i / 3) % 1
      const r = (stage[side] === 3 ? 3.5 : 2) + t * 3.6
      ink
        .fillStyle(0x3e3a37, (1 - t) * 0.58)
        .fillCircle(x - (9 + 12 * t) * nx - 3 * t, y - (9 + 12 * t) * ny - 8 * t, r)
    }
  }

  function endWreck() {
    if (!wreck) return
    const done = wreck
    wreck = undefined
    done.button.remove()
    done.pieces.forEach((piece) => piece.image.destroy())
    done.sites.forEach((site) => site.mist.destroy())
    clouds.clear()
    done.complete()
  }

  function cloudMist(x: number, y: number) {
    const key = 'wreck-cloud-mist'
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, 180, 100)!
      const ctx = texture.context
      for (let i = 0; i < 12; i++) {
        const cx = 29 + (i % 7) * 20
        const cy = 52 + Math.sin(i * 2.3) * 12
        const r = 22 + (i % 3) * 5
        const mist = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, r)
        mist.addColorStop(0, i % 2 ? 'rgba(221,222,192,.72)' : 'rgba(170,193,183,.8)')
        mist.addColorStop(0.55, 'rgba(186,199,183,.48)')
        mist.addColorStop(1, 'rgba(145,174,169,0)')
        ctx.fillStyle = mist
        ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
      }
      texture.refresh()
    }
    return scene.add.image(x, y, key).setDepth(7.5).setAlpha(0)
  }

  function startWreck(event: { sunk: Side[]; complete: () => void }) {
    if (wreck) return
    if (!event.sunk.length) {
      event.complete()
      return
    }
    const pieces: FallingPiece[] = []
    const sites: Wreck['sites'] = []
    // Use the ship's own painted bow, deck and stern for the falling debris.
    for (const side of event.sunk) {
      const view = views[side],
        pose = poses[side],
        key = damagedHull(scene, original[side], 3)
      view.hull.setVisible(false)
      view.shadow.setVisible(false)
      sites.push({ x: pose.x, y: pose.y, mist: cloudMist(pose.x, pose.y) })
      for (let i = 0; i < 3; i++) {
        const piece = scene.add.image(pose.x, pose.y, key).setDepth(6 - i * 0.01)
        const left = Math.floor((piece.width * i) / 3),
          right = Math.floor((piece.width * (i + 1)) / 3)
        piece.setCrop(left, 0, right - left, piece.height)
        piece.setScale(view.hull.scaleX, view.hull.scaleY).setRotation(pose.heading)
        pieces.push({
          image: piece,
          x: pose.x,
          y: pose.y,
          heading: pose.heading,
          scaleX: view.hull.scaleX,
          scaleY: view.hull.scaleY,
          driftX: (i - 1) * Math.cos(pose.heading) * 46 + 8,
          driftY: (i - 1) * Math.sin(pose.heading) * 46 + (i % 2 ? -13 : 9),
          spin: (i - 1) * 1.1 + 0.35,
        })
      }
    }
    battleSound('wreck')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'duel-skip-wreck'
    button.textContent = 'Skip wreck sequence'
    button.onclick = endWreck
    root.append(button)
    button.focus({ preventScroll: true })
    wreck = { age: 0, pieces, sites, sunk: event.sunk, button, complete: event.complete }
  }

  function drawWreck(dt: number) {
    if (!wreck) return
    wreck.age += dt
    const reduced = motion.matches
    const t = clamp(wreck.age / (reduced ? 0.4 : WRECK_SECONDS))
    clouds.clear()
    for (const p of wreck.pieces) {
      const fall = clamp((t - 0.04) / 0.96)
      const scale = reduced ? 1 : 1 - fall * 0.63
      p.image
        .setPosition(
          p.x + (reduced ? 0 : p.driftX * fall),
          p.y + (reduced ? 0 : p.driftY * fall + 78 * fall * fall),
        )
        .setScale(p.scaleX * scale, p.scaleY * scale * (reduced ? 0.86 : 1 - 0.48 * fall))
        .setRotation(p.heading + (reduced ? 0.09 : p.spin * fall))
        .setAlpha(reduced ? 0.8 : 1 - clamp((t - 0.6) / 0.4))
      if (t > 0.16 || reduced) p.image.setTint(0x847873)
    }
    for (const site of wreck.sites) {
      const fall = clamp((t - 0.06) / 0.94)
      const y = site.y + (reduced ? 6 : 57 * fall)
      if (!reduced) {
        const flash = clamp(1 - 5 * t)
        clouds.fillStyle(0xffe4ae, flash * 0.6).fillEllipse(site.x, site.y, 45 * flash, 18 * flash)
        // The lift housing comes apart before the larger pieces reach the cloud deck.
        const travel = Math.min(1, t * 1.7)
        for (let i = 0; i < 12; i++) {
          const angle = i * 2.39996
          const dx = Math.cos(angle),
            dy = Math.sin(angle)
          const distance = (22 + (i % 5) * 9) * travel
          const x = site.x + dx * distance,
            y = site.y + dy * distance + 49 * t * t
          clouds
            .lineStyle(2.2, i % 3 ? 0xb58254 : 0xffdc94, 1 - travel * travel)
            .lineBetween(x, y, x + dx * 6, y + dy * 6 + 2)
        }
      }
      const spread = reduced ? 0.65 : 0.38 + 0.68 * fall
      site.mist
        .setPosition(site.x, y + 2)
        .setScale(spread, spread * 0.78)
        .setAlpha(reduced ? 0.36 : Math.sin(Math.PI * fall) * 0.95)
    }
    if (t >= 1) endWreck()
  }

  function tick(_time: number, ms: number) {
    const dt = Math.min(0.09, ms / 1000)
    elapsed += dt
    ink.clear()
    for (const side of SIDES) if (!wreck?.sunk.includes(side)) liftAndSmoke(side)
    for (let i = flashes.length - 1; i >= 0; i--) {
      const flash = flashes[i]
      flash.age += dt
      if (flash.age >= flash.lifetime) flashes.splice(i, 1)
      else drawFlash(flash)
    }
    if (shake) {
      const t = (elapsed - shake.at) / shake.length
      let dx = 0,
        dy = 0
      if (t >= 1 || motion.matches) shake = undefined
      else {
        const unit = scene.scale.width / Math.max(1, scene.game.canvas.getBoundingClientRect().width)
        const distance = unit * shake.power * Math.cos(3 * Math.PI * t) * (1 - t) ** 2
        dx = shake.x * distance
        dy = shake.y * distance
      }
      scene.cameras.main.setScroll(dx, dy)
    }
    drawWreck(dt)
  }

  ships(poses)
  scene.events.on('sky:ships', ships)
  scene.events.on('sky:impact', impact)
  scene.events.on('sky:hit', cannonHit)
  scene.events.on('sky:terminal', startWreck)
  scene.events.on('postupdate', tick)
  scene.events.once('shutdown', () => {
    scene.events
      .off('sky:ships', ships)
      .off('sky:impact', impact)
      .off('sky:hit', cannonHit)
      .off('sky:terminal', startWreck)
      .off('postupdate', tick)
    wreck?.button.remove()
    scene.cameras.main?.setScroll(0, 0)
  })
}
