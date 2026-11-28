import { PortPreview } from './world-flight-port-preview'
import { drawSkyIslets } from './world-islet-art'
import { BANK_STEP, MAX_POSE, POSE_WIDTH, drawBankedHull } from './battle-rig'
import { hullDamageStage, paintHullDamage } from './battle-damage'
import type { BattleSnapshot } from './battle-state'
import { GUN_POSITIONS, stationOffset } from './drill'
import { battleSound } from './audio'
import { WorldSkirmishFx } from './world-skirmish-fx'
import { FlightGround } from './world-flight-ground'
import { flightLight } from './world-flight-light'
import { artwork } from './artwork'
import { PORT_IDS, type PortId } from './data'
import { WORLD_PORTS, WORLD_TOWNS, worldAir, type WorldFlight, type WorldSiteId } from './world-flight'
import type { FlightTown } from './world-flight-town'

type Point = { x: number; y: number }
type Pose = WorldFlight['player']
type Plate = HTMLCanvasElement | HTMLImageElement
const TAU = Math.PI * 2
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const smooth = (n: number) => {
  const t = clamp(n, 0, 1)
  return t * t * (3 - 2 * t)
}
const hash = (x: number, y: number) => {
  let n = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 3, 0x85ebca77)
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b)
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296
}
function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
function image(name: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      void img.decode().then(
        () => resolve(img),
        () => resolve(img),
      )
    }
    img.onerror = () => resolve(undefined)
    img.src = artwork(name)
  })
}

function seamlessGround(img: HTMLImageElement) {
  const w = 640,
    h = 360,
    featherX = 29,
    featherY = 17
  const c = canvas(w + featherX, h + featherY),
    ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const source = ctx.getImageData(0, 0, c.width, c.height).data
  const pixels = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    const srcRow = y * c.width * 4,
      destRow = y * w * 4
    // Only the strips along the top and left need a crossfade. Keep the
    // remaining opaque regional painting exactly as it was sampled.
    pixels.data.set(source.subarray(srcRow, srcRow + w * 4), destRow)
    const limit = y < featherY ? w : featherX
    for (let x = 0; x < limit; x++) {
      const tx = Math.min(1, x / featherX),
        ty = Math.min(1, y / featherY),
        endX = x < featherX ? x + w : x,
        endY = y < featherY ? y + h : y
      const read = (ix: number, iy: number, ch: number) => source[(iy * c.width + ix) * 4 + ch]
      const p = (y * w + x) * 4
      for (let k = 0; k < 3; k++)
        pixels.data[p + k] =
          (1 - ty) * ((1 - tx) * read(endX, endY, k) + tx * read(x, endY, k)) +
          ty * ((1 - tx) * read(endX, y, k) + tx * read(x, y, k))
      pixels.data[p + 3] = 255
    }
  }
  return pixels
}
function cloudSprites(img: HTMLImageElement) {
  return [0.05, 0.32, 0.55].map((offset, i) => {
    const cloud = canvas(264, 156),
      cc = cloud.getContext('2d', { willReadFrequently: true })!
    cc.drawImage(
      img,
      img.width * offset,
      img.height * (0.12 + i * 0.15),
      img.width * 0.4,
      img.height * 0.4,
      0,
      0,
      cloud.width,
      cloud.height,
    )
    const p = cc.getImageData(0, 0, cloud.width, cloud.height)
    for (let y = 0; y < cloud.height; y++)
      for (let x = 0; x < cloud.width; x++) {
        const pos = (y * cloud.width + x) * 4,
          d = p.data,
          l = (d[pos] * 0.31 + d[pos + 1] * 0.56 + d[pos + 2] * 0.13) / 255
        const u = (x / cloud.width) * 2 - 1,
          v = (y / cloud.height) * 2 - 1
        const edge = clamp((1 - Math.hypot(u, v)) / 0.27, 0, 1)
        d[pos + 3] = 255 * clamp((l - 0.43) / 0.44, 0, 1) * edge * edge * (3 - 2 * edge)
      }
    cc.putImageData(p, 0, 0)
    return cloud
  })
}

const shadowCanvas = (img: Plate) => {
  const c = canvas(180, Math.round((180 * img.height) / img.width)),
    ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#1b3440'
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}
interface SternTrail {
  age: number
  left: Point
  right: Point
  strength: number
  wind: Point
}

export class WorldFlightSky {
  private context: CanvasRenderingContext2D
  private background: CanvasRenderingContext2D
  private foreground: CanvasRenderingContext2D
  private preview = new PortPreview()
  private ships = new Map<string, HTMLImageElement>()
  private shadows = new Map<string, Plate>()
  private ground = new FlightGround()
  private banks: Plate[] = []
  private fits = new Map<string, Plate>()
  private seenShots = new WeakSet<object>()
  private flashes: { point: Point; life: number; enemy: boolean }[] = []
  private boomAt = -10
  private dead = false
  private trails: SternTrail[] = []
  private trailClock = 0
  private center: Point
  private w = 1
  private h = 1
  private scale = 1
  private density = 1
  private baseScale = 1
  private elevation = 1.5
  private yaw = 0
  private town?: FlightTown

  private clock = 0
  readonly combatFx = new WorldSkirmishFx()
  constructor(
    private surface: HTMLCanvasElement,
    private modelLayer: HTMLCanvasElement,
    private effectLayer: HTMLCanvasElement,
    origin: Point,
  ) {
    this.center = { x: origin.x, y: origin.y }
    this.background = surface.getContext('2d', { alpha: false })!
    this.foreground = effectLayer.getContext('2d')!
    this.context = this.background
    void import('./world-flight-town')
      .then(({ FlightTown }) => {
        if (!this.dead) this.town = new FlightTown(modelLayer)
      })
      .catch(() => {
        /* The flight and calibrated port previews also work without WebGL. */
      })
    void this.loadGround(origin)
    for (const name of ['schooner-top', 'raider-top', 'watch-top'])
      void image(name).then((img) => {
        if (img && !this.dead) {
          this.ships.set(name, img)
          this.shadows.set(name, shadowCanvas(img))
        }
      })
    void image('cloud-sea').then((img) => {
      if (img && !this.dead) this.banks = cloudSprites(img)
    })
  }
  private async loadGround(origin: Point) {
    const range = (id: PortId) => Math.hypot(WORLD_PORTS[id].x - origin.x, WORLD_PORTS[id].y - origin.y)
    const regions = [...PORT_IDS].sort((a, b) => range(a) - range(b))
    for (const [index, id] of regions.entries()) {
      if (index) {
        // Each readback can occupy a display frame on a cold GPU. Prepare the
        // local landscape first and process the other regions across paints.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      }
      if (this.dead) return
      const img = await image('battle-' + id)
      if (this.dead) return
      if (img) this.ground.register(id, seamlessGround(img))
    }
  }
  destroy() {
    this.dead = true
    this.town?.dispose()
    this.trails = []
    this.preview.dispose()
    this.banks = []
    this.ships.clear()
    this.shadows.clear()
    this.ground.dispose()
  }
  resize(w: number, h: number) {
    this.w = Math.max(1, w)
    this.h = Math.max(1, h)
    this.baseScale = clamp(Math.min(w / 1020, h / 680), 0.69, 1.35)
    this.density = Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(4600000 / (this.w * this.h)))
    this.surface.width = Math.round(this.w * this.density)
    this.surface.height = Math.round(this.h * this.density)
    this.effectLayer.width = this.surface.width
    this.effectLayer.height = this.surface.height
  }
  private planeScale(depth: number) {
    return depth >= 1 ? this.scale : this.baseScale + (this.scale - this.baseScale) * 0.1
  }
  project(p: Point, depth = 1) {
    const dx = p.x - this.center.x,
      dy = p.y - this.center.y,
      angle = depth === 1 ? this.yaw : 0
    const units = this.planeScale(depth) * depth
    return {
      x: this.w / 2 + (dx * Math.cos(angle) - dy * Math.sin(angle)) * units,
      y: this.h / 2 + (dy * Math.cos(angle) + dx * Math.sin(angle)) * Math.sin(this.elevation) * units,
    }
  }
  render(
    flight: WorldFlight,
    dt: number,
    reduced: boolean,
    berth?: { port: PortId; site?: WorldSiteId },
    battle?: BattleSnapshot,
    cannons = 1,
    repaired = false,
  ) {
    let c = this.background
    this.context = c
    const p = flight.player,
      air = worldAir(flight, p)
    const ahead = reduced ? 0 : Math.min(0.95, 0.6 + Math.hypot(p.vx, p.vy) / 240)
    const closest =
      berth?.port ??
      PORT_IDS.reduce((a, b) =>
        Math.hypot(p.x - WORLD_TOWNS[a].center.x, p.y - WORLD_TOWNS[a].center.y) <
        Math.hypot(p.x - WORLD_TOWNS[b].center.x, p.y - WORLD_TOWNS[b].center.y)
          ? a
          : b,
      )
    const town = WORLD_TOWNS[closest],
      dist = Math.hypot(p.x - town.center.x, p.y - town.center.y)
    const range = clamp((880 - dist) / 635, 0, 1),
      near = range * range * (3 - 2 * range),
      site = town.sites.find((s) => s.id === berth?.site)
    const lead = { x: p.x + p.vx * ahead, y: p.y + p.vy * ahead }
    const dx = town.center.x - p.x,
      dy = town.center.y - p.y
    const speed = Math.hypot(p.vx, p.vy)
    const approachRate = (dx * p.vx + dy * p.vy) / Math.max(1, dist * speed)
    const inbound = smooth((approachRate - 0.16) / 0.64) * smooth((speed - 8) / 28)
    // A pilot flying toward the harbor first sees its whole overhead silhouette.
    // Pull the camera back only as far as the current viewport and bearing need.
    const overview = inbound * smooth((1850 - dist) / 650) * (1 - smooth((650 - dist) / 360))
    const framing = site ? Math.min(this.w / 132, this.h / 164) : Math.min(this.w / 435, this.h / 350)
    const wideScale = Math.min(
      this.baseScale,
      Math.max(0.34, Math.min((this.w * 0.73) / (Math.abs(dx) + 265), (this.h * 0.69) / (Math.abs(dy) + 240))),
    )
    const transitScale = this.baseScale + (wideScale - this.baseScale) * overview
    const closeZoom = near * (1 - overview)
    const settle = near * near * 0.62
    const interest = settle + (0.51 - settle) * overview
    const target = site
      ? { ...site.position }
      : {
          x: lead.x + (town.center.x - lead.x) * interest,
          y: lead.y + (town.center.y - lead.y) * interest,
        }
    const response = !this.clock ? 1 : 1 - Math.exp(-dt * (site ? 3.3 : 4.6))
    this.scale += (transitScale + (framing - transitScale) * closeZoom - this.scale) * response
    this.elevation +=
      ((site?.id === 'dockworker' ? 0.38 : site ? 0.43 : 1.5 - 0.77 * closeZoom) - this.elevation) * response
    this.yaw += ((closest === 'sunstep' || closest === 'copperfall' ? 0.19 : -0.19) * near - this.yaw) * response
    if (site) {
      // The counter stays visible beside its sheet (above it on a handset).
      const horizontal = this.w > 600 ? Math.min(235, this.w * 0.21) / this.scale : 0
      const down = this.w <= 600 ? (this.h * 0.29) / (Math.sin(this.elevation) * this.scale) : 0
      target.x += horizontal * Math.cos(this.yaw) + down * Math.sin(this.yaw)
      target.y += down * Math.cos(this.yaw) - horizontal * Math.sin(this.yaw)
    }
    this.center.x += (target.x - this.center.x) * response
    this.center.y += (target.y - this.center.y) * response
    if (!site) {
      const hero = this.project(p),
        margin = Math.min(this.w * 0.19, 25 + 44 * this.scale)
      const spillX = (hero.x - clamp(hero.x, margin, this.w - margin)) / this.scale
      const spillY =
        (hero.y - clamp(hero.y, Math.min(this.h * 0.25, 88), this.h - Math.min(this.h * 0.25, 94))) /
        (this.scale * Math.sin(this.elevation))
      this.center.x += Math.cos(this.yaw) * spillX + Math.sin(this.yaw) * spillY
      this.center.y += Math.cos(this.yaw) * spillY - Math.sin(this.yaw) * spillX
    }
    this.clock += dt
    // Stream a single town before its skyline enters even an ultra-wide camera.
    const viewRadius = Math.hypot(this.w, this.h) / (2 * this.scale * Math.sin(this.elevation))
    const inRange = dist < viewRadius + 1730
    if (inRange) this.town?.request(closest)
    const gpu = !!this.town?.available
    c.setTransform(this.density, 0, 0, this.density, 0, 0)
    c.fillStyle = '#446f75'
    c.fillRect(0, 0, this.w, this.h)
    const shake = this.combatFx.drift(c, dt, reduced)
    const shakeTransform = shake ? 'translate(' + shake.x + 'px,' + shake.y + 'px)' : ''
    if (this.modelLayer.style.transform !== shakeTransform) this.modelLayer.style.transform = shakeTransform
    // Keep the flight camera world-anchored as the near island grows above the more distant ground.
    this.ground.draw(c, this.center, this.planeScale(0.38) * (0.35 - 0.16 * near), this.w, this.h)
    const weather = flight.weather.kind,
      light = flightLight((flight.skyTimeAtDeparture ?? 0) + flight.elapsed, flight.weather)
    c.fillStyle =
      weather === 'squall'
        ? 'rgba(35,57,78,.31)'
        : weather === 'frost'
          ? 'rgba(201,223,235,.19)'
          : weather === 'haze'
            ? 'rgba(214,205,169,.17)'
            : 'rgba(104,151,149,.10)'
    c.fillRect(0, 0, this.w, this.h)
    c.fillStyle = 'rgba(22,45,80,' + (0.46 * light.night + 0.15 * near) + ')'
    c.fillRect(0, 0, this.w, this.h)
    if (light.dusk) {
      c.fillStyle = 'rgba(247,157,93,' + 0.17 * light.dusk + ')'
      c.fillRect(0, 0, this.w, this.h)
    }
    if (near > 0) {
      // A town rises well above the distant ground. Air between these planes
      // softens the valleys without washing out the illuminated settlement.
      const air = c.createLinearGradient(0, 0, 0, this.h)
      air.addColorStop(0, light.night > 0.5 ? '#4c6889' : '#9cbec4')
      air.addColorStop(1, light.night > 0.5 ? '#536d87' : '#abc5bd')
      c.save()
      c.globalAlpha = near * 0.6
      c.fillStyle = air
      c.fillRect(0, 0, this.w, this.h)
      c.restore()
    }
    this.cloudLayer(0.66, 235, flight, reduced, false)
    drawSkyIslets(
      c,
      this.center,
      viewRadius + 160,
      (point, height) => {
        const at = this.project(point)
        at.y -= height * this.scale * Math.cos(this.elevation)
        return at
      },
      light,
    )
    if (inRange && (!gpu || !this.town?.ready(closest)))
      this.preview.draw(c, closest, this.project(town.center), this.scale, this.elevation, this.yaw, light.night)
    if (gpu && near < 1) {
      const shadow = this.shadows.get('schooner-top')
      if (shadow) {
        const pos = this.project(p),
          w = 83 * this.scale,
          h = (w * shadow.height) / shadow.width
        c.save()
        c.translate(pos.x + this.scale * 12, pos.y + this.scale * 18)
        c.rotate(p.heading + this.yaw)
        c.globalAlpha = 0.19 * (1 - near)
        c.drawImage(shadow, -w / 2, -h / 2, w, h)
        c.restore()
      }
    }
    if (reduced) this.trails.length = 0
    else this.sternWake(p, air.wind, dt)
    const damage = battle ? hullDamageStage(battle.player.hull, battle.player.maxHull) : 0
    if (gpu)
      this.town!.draw(
        closest,
        this.center,
        this.scale,
        this.elevation,
        this.yaw,
        this.w,
        this.h,
        dt,
        this.clock,
        p,
        repaired,
        light,
        reduced,
        cannons,
        damage,
        !battle || battle.player.hull > 0,
      )
    // Compose the opaque ground, transparent WebGL town and front cloud/ship effects
    // directly in the browser. No full-frame WebGL readback or second copy of the island.
    c = this.foreground
    this.context = c
    c.setTransform(this.density, 0, 0, this.density, 0, 0)
    c.clearRect(0, 0, this.w, this.h)
    if (shake) c.translate(shake.x, shake.y)
    for (const actor of flight.traffic) {
      const foe = battle?.worldActor === actor.id ? battle.enemy : undefined
      if (foe && !foe.hull) continue
      this.drawShip(
        actor.ship,
        actor.kind === 'raider' ? 'raider-top' : actor.kind === 'tender' ? 'watch-top' : 'schooner-top',
        actor.kind === 'merchant' ? 76 : 69,
        reduced,
        foe?.guns.length ?? 0,
        foe ? hullDamageStage(foe.hull, foe.maxHull) : 0,
      )
      if (actor.behavior === 'struck') {
        const pos = this.project(actor.ship),
          u = this.scale
        c.save()
        c.translate(pos.x, pos.y)
        c.scale(u, u)
        c.strokeStyle = '#513e34'
        c.beginPath()
        c.moveTo(0, -8)
        c.lineTo(0, -23)
        c.stroke()
        c.fillStyle = '#fff2d5'
        c.beginPath()
        c.moveTo(0, -23)
        c.lineTo(12, -20)
        c.lineTo(0, -17)
        c.fill()
        c.restore()
      }
    }
    if (!gpu && (!battle || battle.player.hull > 0)) this.drawShip(p, 'schooner-top', 83, reduced, cannons, damage)
    this.combatFx.draw(
      c,
      (p) => this.project(p),
      this.scale,
      reduced,
      (...args) => this.drawShip(...args),
    )
    if (battle) this.projectiles(battle, dt, reduced)
    if (weather === 'squall' || weather === 'rain') this.cloudLayer(1.12, 520, flight, reduced, true)
  }
  private cloudLayer(depth: number, cell: number, flight: WorldFlight, reduced: boolean, near: boolean) {
    if (!this.banks.length) return
    const c = this.context,
      t = reduced ? 0 : flight.elapsed,
      speed = near ? 10 : 3
    const offsetX = t * flight.weather.wind.x * speed,
      offsetY = t * flight.weather.wind.y * speed
    const sx = (this.center.x * depth - offsetX) / cell,
      sy = (this.center.y * depth - offsetY) / cell
    const nx = Math.ceil(this.w / this.scale / cell / 2) + 1,
      ny = Math.ceil(this.h / this.scale / cell / 2) + 1
    const squall = flight.weather.kind === 'squall',
      rain = flight.weather.kind === 'rain',
      cover = near ? (squall ? 0.58 : 0.17) : squall ? 0.72 : rain ? 0.49 : 0.21
    c.save()
    c.globalAlpha = near ? (squall ? 0.91 : 0.13) : squall ? 0.78 : rain ? 0.52 : 0.3
    for (let y = Math.floor(sy) - ny; y <= Math.floor(sy) + ny; y++)
      for (let x = Math.floor(sx) - nx; x <= Math.floor(sx) + nx; x++) {
        const h = hash(x, y)
        if (h > cover) continue
        const u = ((x + hash(x + 44, y)) * cell + offsetX - this.center.x * depth) * this.scale + this.w / 2
        const v = ((y + hash(x, y + 18)) * cell + offsetY - this.center.y * depth) * this.scale + this.h / 2
        const width = (near ? 585 : 315) * (0.7 + 0.7 * h) * this.scale
        c.save()
        c.translate(u, v)
        c.rotate((hash(x + 12, y - 2) - 0.5) * 0.83)
        c.drawImage(
          this.banks[Math.floor(h * 13) % this.banks.length],
          -width / 2,
          -width * 0.3,
          width,
          width * 0.6,
        )
        c.restore()
      }
    c.restore()
  }
  private sternWake(p: Pose, wind: Point, dt: number) {
    const speed = Math.hypot(p.vx, p.vy),
      strength = clamp((speed - 12) / 76, 0, 1),
      cs = Math.cos(p.heading),
      sn = Math.sin(p.heading)
    this.trailClock += dt
    for (const k of this.trails) {
      k.age += dt
      for (const pt of [k.left, k.right]) {
        pt.x += k.wind.x * dt * 0.25
        pt.y += k.wind.y * dt * 0.25
      }
    }
    this.trails = this.trails.filter((k) => k.age < 1.2 + k.strength * 1.4)
    if (this.trailClock >= 0.065 && strength > 0.03) {
      const stern = (side: number) => ({ x: p.x - 34 * cs - side * 7 * sn, y: p.y - 34 * sn + side * 7 * cs })
      this.trails.push({ age: 0, left: stern(-1), right: stern(1), strength, wind: { ...wind } })
      this.trailClock = 0
    }
    const c = this.context
    c.save()
    c.lineCap = 'round'
    for (const side of ['left', 'right'] as const) {
      for (let i = 1; i < this.trails.length; i++) {
        const a = this.trails[i - 1],
          b = this.trails[i]
        if (Math.hypot(a[side].x - b[side].x, a[side].y - b[side].y) > 36) continue
        const fade = 1 - a.age / (1.2 + a.strength * 1.4),
          u = this.project(a[side]),
          v = this.project(b[side])
        c.beginPath()
        c.moveTo(u.x, u.y)
        c.lineTo(v.x, v.y)
        c.strokeStyle = 'rgba(238,248,234,' + 0.59 * fade * fade * a.strength + ')'
        c.lineWidth = this.scale * (1.4 + a.age * 2.2) * (0.6 + a.strength * 0.5)
        c.stroke()
      }
    }
    c.restore()
  }
  private projectiles(battle: BattleSnapshot, dt: number, reduced: boolean) {
    const c = this.context
    for (const shot of battle.projectiles) {
      const at = this.project(shot)
      if (!this.seenShots.has(shot)) {
        this.seenShots.add(shot)
        if (shot.lifetime > 1.92) {
          this.flashes.push({
            point: { x: shot.x - shot.vx * 0.02, y: shot.y - shot.vy * 0.02 },
            life: 0.14,
            enemy: shot.enemy,
          })
          if (this.clock - this.boomAt > 0.14) {
            battleSound('cannon', 0.65)
            this.boomAt = this.clock
          }
        }
      }
      c.fillStyle = '#c7c3ac'
      c.beginPath()
      c.arc(at.x, at.y, 3.8 * this.scale, 0, TAU)
      c.fill()
      c.fillStyle = '#29383b'
      c.beginPath()
      c.arc(at.x, at.y, 3 * this.scale, 0, TAU)
      c.fill()
      c.fillStyle = shot.enemy ? '#ffc496' : '#ffe2ad'
      c.beginPath()
      c.arc(at.x - this.scale, at.y - this.scale, this.scale, 0, TAU)
      c.fill()
    }
    this.flashes = this.flashes.filter((f) => f.life > 0)
    for (const f of this.flashes) {
      f.life -= dt
      const at = this.project(f.point)
      c.save()
      c.globalAlpha = clamp(f.life / 0.14, 0, 1) * 0.65
      c.fillStyle = f.enemy ? '#ffaf7e' : '#ffe0a4'
      c.beginPath()
      c.arc(at.x, at.y, (reduced ? 4 : 4 + (1 - f.life / 0.14) * 5) * this.scale, 0, TAU)
      c.fill()
      c.restore()
    }
    for (const crate of battle.salvage?.crates ?? []) {
      if (crate.taken) continue
      const at = this.project(crate),
        s = 7 * this.scale
      c.fillStyle = '#b28255'
      c.strokeStyle = '#514b3f'
      c.lineWidth = 2
      c.fillRect(at.x - s, at.y - s, s * 2, s * 2)
      c.strokeRect(at.x - s, at.y - s, s * 2, s * 2)
      c.strokeStyle = '#e7c08b'
      c.beginPath()
      c.moveTo(at.x - s, at.y - s)
      c.lineTo(at.x + s, at.y + s)
      c.stroke()
    }
  }
  private drawShip(ship: Pose, key: string, length: number, reduced: boolean, cannons: number, damage: number) {
    const pos = this.project(ship),
      img = this.ships.get(key),
      shadow = this.shadows.get(key)
    if (!img || pos.x < -90 || pos.x > this.w + 90 || pos.y < -90 || pos.y > this.h + 90) return
    const c = this.context,
      heave = reduced ? 0 : ship.heave,
      heel = reduced ? 0 : ship.heel
    const step = clamp(Math.round(heel / BANK_STEP), -MAX_POSE, MAX_POSE),
      baseKey = key + '-' + cannons + '-' + damage
    let base = this.fits.get(baseKey)
    if (!base) {
      const hull = canvas(img.width, img.height),
        hc = hull.getContext('2d')!
      hc.drawImage(img, 0, 0)
      for (const g of GUN_POSITIONS.slice(0, cannons)) {
        const x = hull.width * (0.5 + stationOffset(g.station) / 94),
          y = hull.height * (g.side === 'port' ? 0.33 : 0.66)
        hc.fillStyle = '#534a3e'
        hc.fillRect(x - 3, y - 5, 6, 10)
        hc.fillStyle = '#b19668'
        hc.fillRect(x - 1, y - 5, 2, 10)
      }
      if (damage) paintHullDamage(hc, hull.width, hull.height, damage, key === 'raider-top')
      base = hull
      this.fits.set(baseKey, hull)
    }
    let pose = base
    if (step) {
      const stamp = baseKey + '-' + step
      let rolled = this.fits.get(stamp)
      if (!rolled) {
        const b = canvas(POSE_WIDTH, Math.ceil((1.45 * POSE_WIDTH * img.height) / img.width))
        drawBankedHull(b.getContext('2d')!, base, img.width, img.height, step)
        this.fits.set(stamp, b)
        rolled = b
      }
      pose = rolled
    }
    const w = length * this.scale * (1 + heave * 0.012),
      h = (w * pose.height) / pose.width
    if (shadow) {
      const sh = (w * img.height) / img.width
      c.save()
      c.translate(pos.x + (11 + heave * 1.3) * this.scale, pos.y + (17 + heave * 2.8) * this.scale)
      c.rotate(ship.heading + this.yaw)
      c.globalAlpha *= 0.23
      c.drawImage(shadow, -w * 0.5, -sh * 0.5, w, sh * Math.cos(step * BANK_STEP))
      c.restore()
    }
    c.save()
    c.translate(pos.x, pos.y - heave * 2 * this.scale)
    c.rotate(ship.heading + this.yaw)
    c.drawImage(pose, -w / 2, -h / 2, w, h)
    c.restore()
  }
}
