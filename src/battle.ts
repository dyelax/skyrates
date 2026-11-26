import { launchCargo, collectCargo, fallingPoint, recovered, salvageReceipt, type SalvageLoad, type SalvageState, type SalvageReceipt } from './salvage'
import { SalvageView } from './salvage-view'
import Phaser from 'phaser'
import { battery, syncBattery } from './battle-battery'
import { artwork } from './artwork'
import type { PortId } from './data'
import { mountBattleFx } from './battle-fx'
import { prepareHull } from './battle-damage'
import { AirshipRig } from './battle-rig'
import { drawBoarders } from './boarding-art'
import { BattleMarkers } from './battle-markers'
import './battle-fx.css'
import type { WeatherReport } from './weather'
import { CloudDeck } from './cloud-deck'
import {
  SKY,
  STILL_AIR,
  moveShot,
  angleBetween,
  buildOpponent,
  buildShip,
  closestSide,
  fireBroadside,
  hitsShip,
  gunBearsOn,
  gunMuzzle,
  headingForBroadside,
  helmForHeading,
  raiderLookout,
  localPoint,
  moveShip,
  sideBearing,
  steerRaider,
  wrapAngle,
} from './battle-model'
import type { BattleOpponent, Point, Shot, Side, Vessel } from './battle-model'
import { combatEnding, contactStep, hullContact, PHYSICS_STEP, type CrewPair } from './contact-combat'
import type { BattleEnding, BattleSnapshot, ContactClock } from './battle-state'
import { battleSound } from './audio'
import {
  COACH,
  chalkRun,
  chalkPoint,
  evadedRound,
  type ChalkRun,
  type DrillStage,
} from './drill'
import './battle.css'
import './battle-markers.css'

export type BattleOutcome = BattleEnding
export interface BattleOptions {
  opponent: BattleOpponent
  crew: number
  skill: number
  gunLevel: number
  cannons: number
  location: PortId
  weather: WeatherReport
  drill?: { stage: DrillStage; onCheckpoint: (stage: DrillStage) => void; onLeave: (skip: boolean) => void }
  hullLevel: number
  startingHull?: number
  quickGunnery?: boolean
  shipName?: string
  onExit?: () => void
  combatRandom?: () => number
  onUnavailable: () => void
  savedBattle?: BattleSnapshot
  onSave?: (snapshot: BattleSnapshot) => void
  salvageLoad?: SalvageLoad
  onFinish: (outcome: BattleEnding, remainingHull: number, enemyHull: number, crew: Readonly<CrewPair>, salvage?: SalvageReceipt) => void
}

type Projectile = Shot & { enemy: boolean }
interface Spark extends Point {
  vx: number
  vy: number
  ttl: number
  duration: number
  size: number
  color: number
}
const clamp = Phaser.Math.Clamp
const THROTTLE = ['Hove to', 'Ahead slow', 'Cruising', 'Full ahead']
const FAIR_WIND = 0xa6f3d7,
  GOLD = 0xffcf79,
  COPPER = 0xff9275

interface FlightArea {
  width: number
  height: number
  top: number
  bottom: number
}

function measureSky(root: HTMLElement): FlightArea {
  const viewport = root.querySelector<HTMLElement>('.duel-canvas')!.getBoundingClientRect()
  const unit = SKY.width / Math.max(1, viewport.width)
  const height = Math.round(viewport.height * unit)
  const heading = root.querySelector('.duel-top-actions')!.getBoundingClientRect()
  const battery = root.querySelector('.duel-armament')!.getBoundingClientRect()
  const helm = root.querySelector('.duel-orders')!.getBoundingClientRect()
  // Keep both ships within the visible sea of clouds between the instruments.
  const top = Math.min(height * 0.17, (heading.bottom - viewport.top) * unit)
  const bottom = Math.max(height * 0.71, (Math.min(battery.top, helm.top) - viewport.top) * unit)
  return { width: SKY.width, height, top, bottom }
}

// Chart distances stay in world units. Only the drawing buffer follows the
// display density, bounded for large desktop screens and small mobile GPUs.
function drawingSize(container: HTMLElement) {
  const width = Math.max(1, container.clientWidth)
  const height = Math.max(1, container.clientHeight)
  const density = Math.min(window.devicePixelRatio || 1, 3, 4096 / Math.max(width, height), Math.sqrt(8_300_000 / (width * height)))
  return { width: Math.max(1, Math.round(width * density)), height: Math.max(1, Math.round(height * density)) }
}

function hullCard(title: string, id: string): string {
  const meter = (label: string, key: string) => `<div class="duel-meter-title"><span id="gauge-${key}">${label}</span><b data-read="${key}"></b></div><div class="duel-hull-track" role="meter" aria-labelledby="vessel-${id} gauge-${key}" aria-valuemin="0"><i data-fill="${key}"></i></div>`
  return `<div class="duel-ship-readout"><strong class="duel-ship-name" id="vessel-${id}">${title}</strong>${meter('Hull', id)}${meter('Crew health', id + 'Crew')}</div>`
}

export function mountBattle(host: HTMLElement, options: BattleOptions): () => void {
  const root = document.createElement('section')
  root.className = options.drill ? 'air-duel is-drill' : 'air-duel'
  const cannons = options.drill ? 1 : options.savedBattle?.player.guns.length ?? options.cannons
  root.setAttribute('aria-label', 'Airship battle')
  const weather = options.weather
  const windAngle = (Math.atan2(weather.wind.y, weather.wind.x) * 180) / Math.PI
  const windStation = options.drill ? '' : `<figure class="duel-wind" data-marker-obstacle title="${weather.summary} · ${weather.season}">
    <span class="duel-wind-arrow" aria-hidden="true" style="transform:rotate(${windAngle}deg)">${weather.knots ? '➝' : '○'}</span>
    <figcaption>${weather.knots} kn <span>${weather.bearing}</span></figcaption></figure>`
  root.innerHTML = `${windStation}
    <div class="duel-heading">
      <div class="duel-top-actions" data-marker-obstacle>
        ${options.onExit ? '<button type="button" class="duel-exit" data-exit-test>Leave test</button>' : ''}
        <button type="button" class="duel-pause" data-action="pause" aria-label="Pause battle" aria-keyshortcuts="P" aria-pressed="false" title="Pause battle (P)"><span class="pause-icon" aria-hidden="true"></span><span class="resume-label" hidden>Resume</span></button>
      </div>
      <details class="duel-report" data-marker-obstacle hidden><summary>Battle details</summary>
        <div class="report-body"><div class="duel-readouts">${hullCard('Wayfarer', 'player')}${hullCard(options.drill ? 'Watch · Lark' : options.opponent.name, 'enemy')}</div>
        <p class="report-location">Range <b data-read="range"></b>${options.drill ? '' : ' · ' + weather.summary + ' · ' + weather.season}</p>
        <p>Choose a heading in the sky, or turn with <kbd>A</kbd> / <kbd>D</kbd>. Set throttle with <kbd>W</kbd> / <kbd>S</kbd>.</p>
        <p><kbd>Q</kbd> fires every ready port gun. <kbd>E</kbd> fires starboard. Each side reloads one gun at a time. <kbd>Space</kbd> fires the rail facing the enemy. <kbd>B</kbd> closes or pushes off. <kbd>R</kbd> breaks away.</p></div>
      </details>
    </div>
    <div class="duel-stage"><div class="duel-canvas" role="img" aria-label="Overhead sky battle. Choose a heading in the sky, or turn with A and D."></div><div class="duel-markers"></div></div>
    <div class="duel-banner" role="status" data-marker-obstacle hidden></div>
    <div class="duel-armament">${battery('port', cannons)}${battery('starboard', cannons)}</div>
    <div class="duel-orders">
      <div class="duel-throttle" role="group" aria-label="Throttle" data-marker-obstacle>
        <span class="throttle-label">Throttle <b data-read="speed"></b></span>
        <button type="button" data-action="slower" aria-label="Reduce throttle" aria-keyshortcuts="S ArrowDown" title="Reduce throttle (S)">−</button>
        <button type="button" data-action="faster" aria-label="Increase throttle" aria-keyshortcuts="W ArrowUp" title="Increase throttle (W)">+</button>
      </div>
      <div class="duel-engage" data-marker-obstacle>
        <button type="button" data-action="ram" aria-keyshortcuts="B" title="Steer to contact or push the touching ships apart (B)"><span aria-hidden="true">↗</span><span data-read="ramOrder">Close in</span></button>
        <button type="button" data-action="escape" aria-keyshortcuts="R" title="Set a course to leave the fight (R)"><span aria-hidden="true">×</span><span data-read="escapeOrder">Break away</span></button>
      </div>
    </div><span data-read="crew" class="duel-sr-only" role="status"></span>`
  if (options.drill) {
    root.insertAdjacentHTML(
      'beforeend',
      `<section class="drill-coach" data-marker-obstacle aria-label="Harbor Watch instruction"><div class="drill-heading"><span class="drill-chapter"></span><button type="button" data-action="skip">Skip exercise</button></div><h1></h1><p class="drill-copy"></p><div class="drill-actions"><button type="button" data-action="coach"></button></div></section>`,
    )
  }
  if (options.shipName && !options.drill)
    root.querySelector('.duel-ship-name')!.textContent = options.shipName
  if (options.onExit) root.querySelector('[data-exit-test]')?.addEventListener('click', options.onExit)
  host.replaceChildren(root)
  const container = root.querySelector<HTMLElement>('.duel-canvas')!
  const area = measureSky(root)
  const surface = drawingSize(container)
  const scene = new SkyBattle(root, options, area)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: surface.width,
    height: surface.height,
    scene: [scene],
    backgroundColor: '#122f39',
    banner: false,
    audio: { noAudio: true },
    render: { antialias: true, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, expandParent: false },
    fps: { target: 60, forceSetTimeOut: false },
  })
  root.tabIndex = -1
  root.focus({ preventScroll: true })
  const resizeChart = () => {
    if (!game.isBooted) return
    const next = measureSky(root)
    const nextSurface = drawingSize(container)
    if (game.scale.width !== nextSurface.width || game.scale.height !== nextSurface.height)
      game.scale.setGameSize(nextSurface.width, nextSurface.height)
    scene.resizeSky(next)
    game.scale.refresh()
  }
  const resize = new ResizeObserver(resizeChart)
  try {
    resize.observe(container, { box: 'device-pixel-content-box' })
  } catch {
    resize.observe(container)
  }
  for (const panel of document.querySelectorAll('[data-marker-obstacle]')) resize.observe(panel)
  window.addEventListener('resize', resizeChart)
  return () => {
    resize.disconnect()
    window.removeEventListener('resize', resizeChart)
    scene.disconnect()
    game.destroy(true)
    root.remove()
  }
}

class SkyBattle extends Phaser.Scene {
  private root: HTMLElement
  private drill?: DrillStage
  private chalk?: ChalkRun
  private buoy?: Point
  private chalkDelay = 0
  private markers: BattleMarkers
  private opts: BattleOptions
  private player: Vessel
  private foe: Vessel
  private playerView!: AirshipRig
  private foeView!: AirshipRig
  private area: FlightArea
  private clouds?: CloudDeck
  private overlays!: Phaser.GameObjects.Graphics
  private paths!: Phaser.GameObjects.Graphics
  private boardingWatch!: Phaser.GameObjects.Graphics
  private boardingTime = 0
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private shots: Projectile[] = []
  private sparks: Spark[] = []
  private aiDelay = 3.5
  private hudIn = 0
  private bannerTTL = 0
  private pressed = new Set<string>()
  private course?: Point
  private wind: Point
  private escaping = false
  private ramming = false
  private pausedDuel = false
  private ended = false
  private ready = false
  private crew: CrewPair
  private crewMax: CrewPair
  private contact: ContactClock = { armed: true, clearSeconds: .4 }
  private touching = false
  private accumulator = 0
  private saveIn = .25
  private salvage?: SalvageState
  private salvageView?: SalvageView
  private terminal: BattleEnding | null = null
  private listeners = new AbortController()
  private banner: HTMLElement
  private readings: Record<string, HTMLElement> = {}
  private buttons: Record<string, HTMLButtonElement> = {}
  private meters: Record<string, HTMLElement> = {}

  constructor(root: HTMLElement, options: BattleOptions, area: FlightArea) {
    super('skyrates-duel')
    this.root = root
    this.opts = options
    this.drill = options.drill?.stage
    this.wind = options.drill ? STILL_AIR : options.weather.wind
    this.area = area
    const flightHeight = area.bottom - area.top
    this.player = buildShip(
      { x: 320, y: area.top + flightHeight * 0.66 },
      -Math.PI * 0.48,
      options.gunLevel,
      options.hullLevel,
      options.startingHull,
      options.quickGunnery,
      options.drill ? 1 : options.cannons,
    )
    this.foe = buildOpponent({ x: 595, y: area.top + flightHeight * 0.51 }, Math.PI * 0.49, options.opponent)
    this.crewMax = { player: options.crew * options.skill, enemy: this.drill ? 3 : options.opponent.crew }
    this.crew = { ...this.crewMax }
    if (options.savedBattle && !this.drill) this.restore(options.savedBattle)
    this.banner = root.querySelector('.duel-banner')!
    this.markers = new BattleMarkers(
      root.querySelector('.duel-markers')!,
      options.shipName || 'Wayfarer',
      this.drill ? 'Watch · Lark' : options.opponent.name,
    )
    root.querySelectorAll<HTMLElement>('[data-read]').forEach((el) => {
      this.readings[el.dataset.read!] = el
    })
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((el) => {
      this.buttons[el.dataset.action!] = el
    })
    root.querySelectorAll<HTMLElement>('[data-fill]').forEach((el) => {
      this.meters[el.dataset.fill!] = el
    })
    if (this.drill) this.setupExercise()
    this.syncHUD()
  }

  preload() {
    for (const [name, file] of [
      ['battle-terrain', 'battle-' + this.opts.location],
      ['sea', 'cloud-sea'],
      ['schooner-art', 'schooner-top'],
      ['opponent-art', this.drill ? 'watch-top' : 'raider-top'],
    ]) {
      this.load.image(name, artwork(file))
    }
  }

  create() {
    if (!this.root.isConnected || this.ended) return
    for (const key of ['sea', 'schooner-art', 'opponent-art']) {
      if (!this.textures.exists(key)) {
        queueMicrotask(() => {
          if (this.root.isConnected) this.opts.onUnavailable()
        })
        return
      }
    }
    prepareHull(this, 'schooner')
    prepareHull(this, 'opponent')
    this.setChartZoom()
    this.clouds = new CloudDeck(this, this.opts.weather, Boolean(this.drill), this.area.width, this.area.height, this.player)
    this.paths = this.add.graphics().setDepth(2)
    this.boardingWatch = this.add.graphics().setName('boarding-at-rail').setDepth(6.5).setVisible(false)
    this.playerView = new AirshipRig(this, 'schooner', 114)
    this.foeView = new AirshipRig(this, 'opponent', 110)
    mountBattleFx(this, this.root, { player: this.playerView, enemy: this.foeView }, { player: this.player, enemy: this.foe })
    this.root.dataset.shipRenderer = 'illustrated'
    this.playerView.update(this.player)
    this.foeView.update(this.foe)
    this.showBoarding(0)
    this.overlays = this.add.graphics().setDepth(7)
    this.ready = true
    this.bindControls()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (
        this.ended ||
        this.pausedDuel ||
        ['briefing', 'debrief'].includes(this.drill ?? '')
      )
        return
      const at = { x: pointer.worldX, y: pointer.worldY }
      if (this.salvageView) {
        this.course = at
        return
      }
      if (Math.hypot(at.x - this.foe.x, at.y - this.foe.y) < 48) {
        if (this.drill && this.drill !== 'fire') return
        this.order(closestSide(this.player, this.foe))
      } else {
        this.ramming = false
        this.course = at
        if (this.drill === 'dodge') this.player.throttle = 2
      }
    })
    if (this.terminal) { this.finish(this.terminal, true); return }
    if (this.drill) this.drawCoach()
    this.syncMarkers()
    this.syncHUD()
  }

  private showBoarding(dt: number) {
    const fighting = this.touching && !this.ended && this.crew.player > 0 && this.crew.enemy > 0 &&
      this.player.hull > 0 && this.foe.hull > 0
    this.boardingWatch.setVisible(fighting)
    if (!fighting) {
      this.boardingTime = 0
      return
    }
    this.boardingTime += dt
    const scale = clamp(this.area.width / Math.max(1, this.scale.displaySize.width), .92, 2.6)
    drawBoarders(this.boardingWatch, hullContact(this.player, this.foe), scale, this.boardingTime, this.reducedMotion.matches)
  }

  private setChartZoom() {
    this.cameras.main.setOrigin(0, 0).setZoom(this.scale.width / this.area.width, this.scale.height / this.area.height)
    const context = this.game.context
    if (context && 'imageSmoothingEnabled' in context) context.imageSmoothingQuality = 'high'
  }

  private syncMarkers() {
    const camera = this.cameras.main
    this.markers.update(this.player, this.foe, this.crew, this.crewMax, this.touching, camera.scrollX, camera.scrollY)
  }

  resizeSky(next: FlightArea) {
    this.markers.resize()
    const previous = this.area
    this.area = next
    if (previous.height !== next.height || previous.top !== next.top || previous.bottom !== next.bottom) {
      const objects: Point[] = [this.player, this.foe, ...this.sparks, ...this.shots]
      if (this.salvage) objects.push(...this.salvage.crates)
      if (this.buoy) objects.push(this.buoy)
      if (this.chalk) this.chalk = undefined
      if (this.course) objects.push(this.course)
      const factor = (next.bottom - next.top) / Math.max(1, previous.bottom - previous.top)
      for (const p of objects) p.y = next.top + (p.y - previous.top) * factor
      this.clouds?.resize(next.width, next.height)
    }
    if (this.cameras?.main) {
      this.setChartZoom()
      this.syncMarkers()
    }
  }

  disconnect() {
    this.listeners.abort()
    this.pressed.clear()
    this.ended = true
  }

  private bindControls() {
    const signal = this.listeners.signal
    let heldForChat = false
    const holdForChat = (open: boolean) => {
      if (open) {
        this.pressed.clear()
        heldForChat = this.ready && !this.pausedDuel && !this.ended
        if (heldForChat) this.order('pause')
      } else if (heldForChat) {
        heldForChat = false
        if (this.pausedDuel) this.order('pause')
      }
    }
    window.addEventListener('pagehide', () => this.save(), { signal })
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save() }, { signal })
    document.addEventListener(
      'skyrates-playtest',
      (event) => holdForChat((event as CustomEvent<boolean>).detail),
      { signal },
    )
    if (document.querySelector('.playtest-dialog[open]')) holdForChat(true)
    this.root.addEventListener(
      'click',
      (event) => {
        const el = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
        if (el) this.order(el.dataset.action!)
      },
      { signal },
    )
    const keyActions: Record<string, string> = {
      w: 'faster',
      arrowup: 'faster',
      s: 'slower',
      arrowdown: 'slower',
      q: 'port',
      e: 'starboard',
      1: 'port',
      2: 'port',
      3: 'starboard',
      4: 'starboard',
      r: 'escape',
      b: 'ram',
      p: 'pause',
      ' ': 'best',
    }
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          this.ended ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.target instanceof HTMLInputElement
        )
          return
        const key = event.key.toLowerCase()
        const steering = ['arrowleft', 'arrowright', 'a', 'd'].includes(key)
        if (!steering && !keyActions[key]) return
        if (key === ' ' && event.target instanceof HTMLElement && event.target.closest('button, summary')) return
        event.preventDefault()
        if (event.repeat) return
        if (steering) {
          this.ramming = false
          this.pressed.add(key)
          this.course = undefined
        } else this.order(keyActions[key])
      },
      { signal },
    )
    window.addEventListener('keyup', (event) => this.pressed.delete(event.key.toLowerCase()), { signal })
    window.addEventListener(
      'blur',
      () => {
        this.pressed.clear()
        if (!this.ended && this.ready && !this.pausedDuel) this.order('pause')
      },
      { signal },
    )
  }

  private order(action: string) {
    if (this.ended) return
    if (this.salvageView && !['faster', 'slower', 'pause'].includes(action)) return
    if (this.drill && action === 'skip') {
      this.opts.drill!.onLeave(true)
      return
    }
    if (!this.ready) return
    if (this.drill && action === 'coach' && !this.pausedDuel) {
      if (this.drill === 'briefing') this.teach('dodge')
      else if (this.drill === 'dodge') {
        if (!this.chalk || this.chalk.traveled > 0) this.startRun()
        if (!this.buoy) return
        this.course = { ...this.buoy }
        this.player.throttle = 2
      } else if (this.drill === 'fire') {
        const gun = this.player.guns[0]
        if (gunBearsOn(this.player, gun, this.foe)) this.order(gun.side)
        else {
          const heading = headingForBroadside(this.player, gun, this.foe)
          this.course = localPoint({ ...this.player, heading }, 130, 0)
          this.player.throttle = 0
        }
      } else if (['board', 'melee', 'return'].includes(this.drill)) this.order('ram')
      else if (this.drill === 'debrief') this.opts.drill!.onLeave(false)
      return
    }
    if (this.drill && action !== 'pause') {
      if (action === 'escape' || (action === 'ram' && !['board', 'melee', 'return'].includes(this.drill))) return
      if (['briefing', 'debrief'].includes(this.drill)) return
      if (['best', 'port', 'starboard'].includes(action) && this.drill !== 'fire')
        return
    }
    if (action === 'pause') {
      this.pausedDuel = !this.pausedDuel
      const actionName = this.pausedDuel ? 'Resume battle' : 'Pause battle'
      this.buttons.pause.setAttribute('aria-label', actionName)
      this.buttons.pause.title = actionName + ' (P)'
      this.buttons.pause.querySelector<HTMLElement>('.resume-label')!.hidden = !this.pausedDuel
      const report = this.root.querySelector<HTMLDetailsElement>('.duel-report')!
      if (!this.pausedDuel && report.contains(document.activeElement)) this.buttons.pause.focus()
      report.hidden = !this.pausedDuel
      if (!this.pausedDuel) report.open = false
      this.buttons.pause.setAttribute('aria-pressed', String(this.pausedDuel))
      this.clearBanner()
    } else if (!this.pausedDuel) {
      if (action === 'faster') this.player.throttle = Math.min(3, this.player.throttle + 1)
      if (action === 'slower') {
        this.ramming = false
        this.player.throttle = Math.max(0, this.player.throttle - 1)
      }
      if (action === 'ram') {
        this.escaping = false
        if (this.touching) {
          const { nx, ny } = hullContact(this.player, this.foe)
          // A short shove from the crew clears the rail without committing to an escape.
          this.ramming = false
          this.course = undefined
          this.player.throttle = 0
          this.player.vx = this.foe.vx - 40 * nx
          this.player.vy = this.foe.vy - 40 * ny
          this.tell('Pushing clear of their rail.', 1.5)
        } else {
          this.ramming = !this.ramming
          this.course = undefined
          if (this.ramming) this.player.throttle = this.drill === 'return' ? 1 : 3
          this.tell(this.ramming ? 'Closing with their rail.' : 'Intercept course belayed.', 1.5)
        }
      }
      if (action === 'escape') {
        this.ramming = false
        this.escaping = !this.escaping
        if (this.escaping) {
          this.player.throttle = 3
          const exits = [
            { x: 0, y: this.player.y },
            { x: this.area.width, y: this.player.y },
            { x: this.player.x, y: this.area.top },
            { x: this.player.x, y: this.area.bottom },
          ]
          this.course = exits.sort(
            (a, b) =>
              Math.hypot(a.x - this.player.x, a.y - this.player.y) -
              Math.hypot(b.x - this.player.x, b.y - this.player.y),
          )[0]
          this.tell('Break away • Reach any lit edge of the chart.', 3.5)
        } else {
          this.course = undefined
          this.tell('Escape order belayed.', 1.2)
        }
      }
      if (action === 'port' || action === 'starboard' || action === 'best') {
        const side = action === 'best' ? closestSide(this.player, this.foe) : action
        if (!this.player.guns.some(gun => gun.side === side)) this.tell('No cannon is fitted on that side.', 2)
        else if (!this.shootRail(this.player, side, this.opts.gunLevel, false)) this.tell('Gunners are reloading.', 1)
      }
    }
    this.save()
    this.syncHUD()
  }

  private clearBanner() {
    this.banner.hidden = true
    this.banner.textContent = ''
    this.bannerTTL = 0
  }

  private tell(message: string, seconds: number) {
    this.banner.textContent = message
    this.banner.hidden = false
    this.bannerTTL = seconds
  }

  private shootRail(ship: Vessel, side: Side, tier: number, enemy: boolean): boolean {
    const shots = fireBroadside(ship, side, tier)
    if (!shots.length) return false
    for (const shot of shots) {
      if (enemy) shot.damage = 8
      this.shots.push({ ...shot, enemy })
      this.burst(shot, enemy ? COPPER : GOLD, 11, 51)
    }
    battleSound('cannon', 0.75 + (shots.length - 1) * 0.125)
    return true
  }

  private burst(p: Point, color: number, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        m = (0.15 + Math.random() * 0.85) * speed
      const duration = 0.16 + Math.random() * 0.52
      this.sparks.push({
        ...p,
        vx: Math.cos(a) * m,
        vy: Math.sin(a) * m,
        size: 1.1 + Math.random() * 2.2,
        duration,
        ttl: duration,
        color,
      })
    }
  }

  private setGauge(key: string, current: number, max: number) {
    const fill = this.meters[key]
    fill.style.width = `${100 * Math.max(0, current) / max}%`
    fill.parentElement!.setAttribute('aria-valuenow', String(current))
    fill.parentElement!.setAttribute('aria-valuemax', String(max))
    fill.parentElement!.setAttribute('aria-valuetext', this.readings[key].textContent!.replace('/', ' of '))
  }

  private syncHUD() {
    for (const [id, ship] of [
      ['player', this.player],
      ['enemy', this.foe],
    ] as const) {
      this.readings[id].textContent = `${Math.max(0, Math.ceil(ship.hull))}/${ship.maxHull}`
      this.setGauge(id, ship.hull, ship.maxHull)
    }
    this.readings.speed.textContent = THROTTLE[this.player.throttle]
    this.readings.range.textContent = `${Math.round(Math.hypot(this.foe.x - this.player.x, this.foe.y - this.player.y))} m`
    for (const id of ['player', 'enemy'] as const) {
      const strength = this.crew[id], max = this.crewMax[id], key = id + 'Crew'
      this.readings[key].textContent = `${strength > 0 && strength < 0.1 ? '<0.1' : Number(strength.toFixed(1))}/${Number(max.toFixed(1))}`
      this.setGauge(key, strength, max)
    }
    const boarding = this.touching ? 'Crews fighting alongside' : ''
    if (this.readings.crew.textContent !== boarding) this.readings.crew.textContent = boarding
    const ramOrder = this.touching ? 'Push off' : this.ramming ? 'Belay' : 'Close in'
    const escapeOrder = this.escaping ? 'Stand & fight' : 'Break away'
    if (this.readings.ramOrder.textContent !== ramOrder) this.readings.ramOrder.textContent = ramOrder
    if (this.readings.escapeOrder.textContent !== escapeOrder) this.readings.escapeOrder.textContent = escapeOrder
    const locked = !this.ready || this.pausedDuel || this.ended
    for (const side of ['port', 'starboard'] as const) {
      const el = this.buttons[side]
      if (!el) continue
      const bearing = this.drill === 'fire' && this.player.guns.some(gun =>
        gun.side === side && gunBearsOn(this.player, gun, this.foe))
      syncBattery(el, side, this.player.guns, locked || (!!this.drill && this.drill !== 'fire'), bearing)
    }
    const helmLocked = locked || (!!this.drill && !['dodge', 'fire', 'board', 'melee', 'return'].includes(this.drill))
    this.buttons.faster.disabled = helmLocked || this.player.throttle >= 3
    this.buttons.slower.disabled = helmLocked || this.player.throttle <= 0
    if (this.drill) {
      const runUnderway = (this.drill === 'board' || this.drill === 'return') && this.ramming
      this.buttons.coach.disabled = !this.ready || this.pausedDuel || runUnderway
      if (this.drill === 'board' || this.drill === 'return')
        this.buttons.coach.textContent = runUnderway ? 'Closing with the cutter…' : 'Close alongside'
      if (this.drill === 'fire') {
        const gun = this.player.guns[0]
        const linedUp = gunBearsOn(this.player, gun, this.foe)
        this.buttons.coach.disabled ||= linedUp && gun.cooldown > 0
        this.buttons.coach.textContent = linedUp ? (gun.cooldown ? 'Reloading…' : 'Fire port gun') : 'Line up port gun'
      }
    }
    this.buttons.escape.disabled = locked || !!this.drill
    this.buttons.ram.disabled = locked || (!!this.drill && !['board', 'melee', 'return'].includes(this.drill))
    this.buttons.ram.setAttribute('aria-pressed', String(this.ramming))
    this.buttons.escape.setAttribute('aria-pressed', String(this.escaping))
  }

  private setupExercise() {
    const mid = (this.area.top + this.area.bottom) / 2
    Object.assign(this.foe, { x: 310, y: mid, heading: Math.PI / 2, throttle: 0 })
    Object.assign(this.player, { x: 625, y: mid, heading: -Math.PI / 2, throttle: 0 })
    if (this.drill && ['board', 'melee', 'return', 'debrief'].includes(this.drill)) {
      this.foe.hull -= 15 + this.opts.gunLevel * 3
    }
    if (this.drill === 'melee' || this.drill === 'return') {
      this.player.x = this.foe.x + (this.drill === 'melee' ? 57 : 95)
      this.player.heading = Math.PI
      this.touching = this.drill === 'melee'
      this.contact.armed = !this.touching
      this.crew.enemy = 2.5
    }
    if (this.drill === 'debrief') this.crew.enemy = 0
    if (this.drill === 'dodge') this.startRun()
    this.drawCoach()
  }

  private drawCoach() {
    if (!this.drill) return
    this.root.dataset.lesson = this.drill
    const content = COACH[this.drill]
    this.root.querySelector('.drill-chapter')!.textContent = content.chapter
    this.root.querySelector('.drill-coach h1')!.textContent = content.title
    this.root.querySelector('.drill-copy')!.textContent = content.text
    const coach = this.buttons.coach
    coach.textContent = {
      briefing: 'Take the helm',
      dodge: 'Steer to the buoy',
      fire: 'Line up port gun',
      board: 'Close alongside',
      melee: 'Push off',
      return: 'Close alongside',
      debrief: 'Leave the exercise',
    }[this.drill]
    this.buttons.skip.hidden = this.drill === 'debrief'
    this.clearBanner()
  }

  private teach(stage: DrillStage) {
    if (stage === this.drill) return
    this.drill = stage
    this.opts.drill!.onCheckpoint(stage)
    this.player.throttle = 0
    this.player.vx = this.player.vy = this.player.angularSpeed = this.player.heel = 0
    this.course = undefined
    this.ramming = false
    this.chalk = undefined
    this.shots.length = 0
    if (stage === 'board') {
      const mid = (this.area.top + this.area.bottom) / 2
      Object.assign(this.foe, { x: 360, y: mid, vx: 0, vy: 0, heading: Math.PI / 2 })
      Object.assign(this.player, { x: 495, y: mid, heading: Math.PI })
    }
    if (stage === 'melee') this.foe.vx = this.foe.vy = 0
    if (stage === 'dodge') this.startRun()
    this.drawCoach()
    this.syncHUD()
  }

  private startRun() {
    // The Watch lines its hull up while laying out the practice lane, then
    // holds that heading through the warning and chalk shot.
    const gun = this.foe.guns[0]
    this.foe.heading = headingForBroadside(this.foe, gun, this.player)
    const muzzle = gunMuzzle(this.foe, gun)
    const bearing = sideBearing(this.foe, gun.side)
    const range = Math.hypot(this.player.x - muzzle.x, this.player.y - muzzle.y)
    this.chalk = chalkRun(muzzle, { x: muzzle.x + range * Math.cos(bearing), y: muzzle.y + range * Math.sin(bearing) })
    const dir = this.player.y > (this.area.top + this.area.bottom) / 2 - 5 ? -1 : 1
    this.buoy = {
      x: this.player.x > 680 ? this.player.x - 80 : this.player.x + 80,
      y: clamp(this.player.y + dir * 94, this.area.top + 25, this.area.bottom - 25),
    }
  }

  private exerciseHelm(dt: number) {
    if (this.drill !== 'dodge') return
    if (!this.chalk) {
      this.chalkDelay -= dt
      if (this.chalkDelay <= 0) this.startRun()
      return
    }
    const run = this.chalk
    const gfx = this.paths
    const end = { x: run.aim.x + run.direction.x * 150, y: run.aim.y + run.direction.y * 150 }
    gfx.lineStyle(17, 0xff865d, 0.16).lineBetween(run.origin.x, run.origin.y, end.x, end.y)
    for (let n = 0; n < run.length + 150; n += 21) {
      gfx
        .lineStyle(2, 0xff9a6e, 0.85)
        .lineBetween(
          run.origin.x + n * run.direction.x,
          run.origin.y + n * run.direction.y,
          run.origin.x + (n + 12) * run.direction.x,
          run.origin.y + (n + 12) * run.direction.y,
        )
    }
    if (this.buoy)
      gfx
        .lineStyle(2, FAIR_WIND, 0.9)
        .strokeCircle(this.buoy.x, this.buoy.y, 12)
        .strokeCircle(this.buoy.x, this.buoy.y, 6)
    if (run.cue > 0) {
      run.cue -= dt
      return
    }
    if (!run.traveled) {
      battleSound('cannon')
      this.burst(run.origin, COPPER, 10, 28)
    }
    run.traveled += dt * 92
    const pos = chalkPoint(run)
    gfx.fillStyle(0xff975c, 1).fillCircle(pos.x, pos.y, 6).fillStyle(0xfff2cb, 1).fillCircle(pos.x, pos.y, 3)
    if (hitsShip(pos, this.player) || run.traveled > run.length + 170) {
      this.chalk = undefined
      this.chalkDelay = 1.7
      this.burst(pos, COPPER, 14, 33)
      this.tell('Chalk on the rail. Watch the line and move across it. Try again.', 2.8)
    } else if (evadedRound(run, this.player)) this.teach('fire')
  }

  private enemyHelm(dt: number) {
    const enemy = this.foe,
      player = this.player
    const range = Math.hypot(enemy.x - player.x, enemy.y - player.y)
    const side = steerRaider(enemy, player, this.area, this.escaping, dt, this.wind)
    this.aiDelay -= dt
    if (this.aiDelay > 0 || range > 520) return
    const target = raiderLookout(enemy, player)
    const gun = enemy.guns.find(g => g.side === side && !g.cooldown && gunBearsOn(enemy, g, target))
    if (gun) {
      this.shootRail(enemy, side, 0, true)
      this.aiDelay = 1.6 + (this.opts.combatRandom ?? Math.random)() * 0.5
    }
  }

  private restore(snapshot: BattleSnapshot) {
    const save = structuredClone(snapshot)
    this.player = save.player
    this.foe = save.enemy
    this.crew = { player: save.playerCrew, enemy: save.enemyCrew }
    this.contact = save.contact
    this.shots = save.projectiles
    this.aiDelay = save.aiDelay
    this.course = save.course ?? undefined
    this.escaping = save.escaping
    this.ramming = save.intercepting
    this.terminal = save.terminal
    this.salvage = save.salvage
    const factor = (this.area.bottom - this.area.top) / (save.area.bottom - save.area.top)
    for (const p of [this.player, this.foe, ...this.shots, ...(this.salvage?.crates ?? []), ...(this.course ? [this.course] : [])]) {
      p.y = this.area.top + (p.y - save.area.top) * factor
    }
    this.touching = hullContact(this.player, this.foe).gap <= .00001
  }

  private save() {
    if (!this.opts.onSave || this.drill || !this.ready) return
    this.saveIn = .25
    this.opts.onSave(structuredClone({
      version: 1, player: this.player, enemy: this.foe,
      playerCrew: this.crew.player, enemyCrew: this.crew.enemy,
      area: { top: this.area.top, bottom: this.area.bottom },
      contact: this.contact, projectiles: this.shots, course: this.course ?? null,
      aiDelay: this.aiDelay, escaping: this.escaping, intercepting: this.ramming,
      terminal: this.terminal, ...(this.salvage ? { salvage: this.salvage } : {}),
    }))
  }

  private finish(outcome: BattleEnding, resume = false) {
    if (this.ended) return
    this.ended = true
    this.terminal = outcome
    if (!resume && outcome === 'victory' && !this.drill && this.opts.salvageLoad) {
      this.salvage = launchCargo('raider-1', this.opts.salvageLoad.manifest, this.player, this.foe, this.area)
      if (this.opts.salvageLoad.free <= 0) this.salvage.remaining = 0
    }
    this.showBoarding(0)
    this.save()
    this.syncHUD()
    const message = {
      victory: `${this.opts.opponent.name} wrecked`,
      boarded: `${this.opts.opponent.name} surrendered`,
      defeat: (this.opts.shipName ?? 'Wayfarer') + ' wrecked', yielded: 'Your crew surrendered',
      withdrawn: 'Both crews withdraw', mutualWreck: 'Both ships are lost',
      escaped: 'You escaped pursuit',
    }[outcome]
    this.tell(message, Infinity)
    this.buttons.pause.disabled = true
    let settled = false
    const complete = () => {
      if (settled || !this.root.isConnected) return
      settled = true
      if (this.salvage?.remaining && this.opts.salvageLoad) this.beginSalvage(resume)
      else this.reportResult(outcome)
    }
    if (resume) { queueMicrotask(complete); return }
    this.events.emit('sky:ships', { player: this.player, enemy: this.foe })
    this.paths.clear()
    this.syncMarkers()
    const sunk = []
    if (!this.player.hull) sunk.push('player')
    if (!this.foe.hull) sunk.push('enemy')
    if (sunk.length) {
      this.overlays.clear()
      this.banner.hidden = true
      if (!this.events.emit('sky:terminal', { sunk, complete, nextLabel: this.salvage?.remaining ? 'Continue to cargo' : undefined })) complete()
    } else this.time.delayedCall(700, complete)
  }

  private reportResult(outcome: BattleEnding) {
    this.listeners.abort()
    const load = this.opts.salvageLoad
    const receipt = this.salvage && load ? salvageReceipt(load.manifest, recovered(this.salvage)) : undefined
    this.opts.onFinish(outcome, this.player.hull, this.foe.hull, { ...this.crew }, receipt)
  }

  private beginSalvage(resume: boolean) {
    const state = this.salvage!,
      load = this.opts.salvageLoad!
    this.ended = false
    this.ramming = this.escaping = this.touching = false
    if (!resume) this.course = undefined
    this.shots.length = 0
    this.pressed.clear()
    this.clearBanner()
    this.paths.clear()
    this.overlays.clear()
    this.foeView.hull.setVisible(false)
    this.foeView.shadow.setVisible(false)
    this.root.classList.add('salvaging')
    this.buttons.pause.disabled = false
    this.salvageView = new SalvageView(
      this,
      this.root,
      load,
      () => {
        if (this.pausedDuel) this.order('pause')
        const targets = state.crates
          .filter((c) => !c.taken)
          .map((c) => fallingPoint(c, state.remaining, this.wind, this.area))
        const distance = (p: Point) => Math.hypot(p.x - this.player.x, p.y - this.player.y)
        this.course = targets.sort((a, b) => distance(a) - distance(b))[0]
        this.player.throttle = 3
        this.save()
      },
      () => this.endSalvage(),
    )
    this.markers.resize()
    this.syncMarkers()
    this.syncHUD()
    this.paintSalvage()
  }

  private paintSalvage() {
    if (this.salvage && this.salvageView)
      this.salvageView.draw(
        this.salvage,
        this.wind,
        this.area,
        clamp(this.area.width / this.scale.displaySize.width, 0.8, 2.4),
      )
  }

  private endSalvage() {
    if (!this.salvageView || !this.salvage || this.ended) return
    this.salvage.remaining = 0
    this.ended = true
    this.save()
    this.salvageView.close()
    this.salvageView = undefined
    this.reportResult('victory')
  }

  private traceCourse() {
    const g = this.paths,
      p = this.player
    for (const [ship, tint] of [
      [p, FAIR_WIND],
      [this.foe, COPPER],
    ] as const) {
      const aft = localPoint(ship, -37, 0),
        nose = localPoint(ship, 26, 0)
      for (const width of [18, 11, 6])
        g.lineStyle(width, tint, 0.05).lineBetween(aft.x, aft.y + 3, nose.x, nose.y + 3)
      const end = localPoint(ship, -43 - ship.throttle * 4, 0)
      g.lineStyle(3, tint, 0.56).lineBetween(aft.x, aft.y, end.x, end.y)
    }
    for (const gun of p.guns) {
      const muzzle = gunMuzzle(p, gun)
      const bearing = sideBearing(p, gun.side)
      const teaching = this.drill === 'fire'
      const linedUp = teaching && gunBearsOn(p, gun, this.foe)
      const range = teaching ? Math.min(640, Math.hypot(this.foe.x - p.x, this.foe.y - p.y) + 28) : 62
      const dx = Math.cos(bearing), dy = Math.sin(bearing)
      g.lineStyle(linedUp ? 2.5 : 2, linedUp ? GOLD : FAIR_WIND, teaching ? .9 : .7)
      for (let n = 7; n < range; n += 15) {
        const end = Math.min(n + 9, range)
        g.lineBetween(muzzle.x + n * dx, muzzle.y + n * dy, muzzle.x + end * dx, muzzle.y + end * dy)
      }
    }
    if (this.course) {
      const c = this.course
      g.lineStyle(1, FAIR_WIND, 0.82)
        .strokeCircle(c.x, c.y, 6)
        .lineBetween(c.x - 9, c.y, c.x - 3, c.y)
        .lineBetween(c.x + 3, c.y, c.x + 9, c.y)
        .lineBetween(c.x, c.y - 9, c.x, c.y - 3)
        .lineBetween(c.x, c.y + 3, c.x, c.y + 9)
    }
    if (this.escaping) {
      g.lineStyle(3, FAIR_WIND, 0.6).strokeRoundedRect(
        11,
        this.area.top + 11,
        this.area.width - 22,
        this.area.bottom - this.area.top - 22,
        10,
      )
    }

  }

  private effects(dt: number) {
    const gfx = this.overlays
    gfx.clear()
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]
      s.ttl -= dt
      if (s.ttl <= 0) {
        this.sparks.splice(i, 1)
        continue
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
      gfx
        .fillStyle(s.color, (s.ttl / s.duration) * 0.8)
        .fillCircle(s.x, s.y, s.size * (0.45 + (s.ttl / s.duration) * 0.55))
    }
    for (const shot of this.shots) {
      const tint = shot.enemy ? COPPER : GOLD
      gfx
        .lineStyle(3.4, tint, 0.52)
        .lineBetween(shot.x - shot.vx * 0.057, shot.y - shot.vy * 0.057, shot.x, shot.y)
      gfx
        .lineStyle(1.5, 0xfff0c4, 1)
        .lineBetween(shot.x - shot.vx * 0.034, shot.y - shot.vy * 0.034, shot.x, shot.y)
      gfx.fillStyle(0xfff0c4, 1).fillCircle(shot.x, shot.y, 2.5)
    }
  }

  private step(dt: number) {
    const left = this.pressed.has('a') || this.pressed.has('arrowleft')
    const right = this.pressed.has('d') || this.pressed.has('arrowright')
    let helm = Number(right) - Number(left)
    if (this.ramming) {
      const lead = Math.min(1.65, Math.hypot(this.foe.x - this.player.x, this.foe.y - this.player.y) / 115)
      this.course = { x: this.foe.x + this.foe.vx * lead, y: this.foe.y + this.foe.vy * lead }
    }
    if (this.course && !left && !right) {
      const distance = Math.hypot(this.player.x - this.course.x, this.player.y - this.course.y)
      const desired = angleBetween(this.player, this.course)
      const turn = wrapAngle(desired - this.player.heading)
      if (distance < (this.drill === 'dodge' ? 25 : 12)) {
        this.course = undefined
        if (this.drill === 'dodge') this.player.throttle = 0
      } else {
        helm = helmForHeading(this.player, desired)
        if (this.drill === 'dodge') this.player.throttle = Math.abs(turn) > 1.15 ? 0 : distance < 52 ? 1 : 2
      }
    }
    if (this.drill !== 'briefing' && this.drill !== 'debrief') moveShip(this.player, helm, dt, this.wind)
    if (this.salvage && this.salvageView && this.opts.salvageLoad) {
      this.player.x = clamp(this.player.x, 24, this.area.width - 24)
      this.player.y = clamp(this.player.y, this.area.top + 22, this.area.bottom - 22)
      const picked = collectCargo(this.salvage, this.opts.salvageLoad, this.player, this.wind, this.area, dt)
      if (picked) this.saveIn = 0
      if (this.salvage.remaining <= 0) this.endSalvage()
      return
    }
    if (this.drill) this.exerciseHelm(dt)
    else this.enemyHelm(dt)
    const p = this.player
    const atEscapeEdge = this.escaping &&
      (p.x < 27 || p.y < this.area.top + 27 || p.x > this.area.width - 27 || p.y > this.area.bottom - 27)
    // Keep practice shots within range, including tall phone and tablet viewports.
    const mid = (this.area.top + this.area.bottom) / 2
    p.x = clamp(p.x, this.drill ? 140 : 24, this.drill ? 765 : this.area.width - 24)
    p.y = this.drill
      ? clamp(p.y, Math.max(this.area.top + 22, mid - 134), Math.min(this.area.bottom - 22, mid + 134))
      : clamp(p.y, this.area.top + 22, this.area.bottom - 22)
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      moveShot(s, dt, this.wind)
      const target = s.enemy ? p : this.foe
      if (hitsShip(s, target)) {
        this.shots.splice(i, 1)
        const previousHull = target.hull
        target.hull = Math.max(0, target.hull - s.damage)
        target.vx += s.vx * 0.018
        target.vy += s.vy * 0.018
        const speed = Math.hypot(s.vx, s.vy) || 1
        if (!this.events.emit('sky:hit', { x: s.x, y: s.y, nx: s.vx / speed, ny: s.vy / speed,
          damage: Math.min(s.damage, previousHull), side: s.enemy ? 'player' : 'enemy' })) {
          this.burst(s, s.enemy ? COPPER : GOLD, 18, 70)
          battleSound('hit')
        }
        this.saveIn = 0

        if (this.drill === 'fire' && !s.enemy) {
          this.teach('board')
          break
        }

      } else if (
        s.lifetime <= 0 ||
        s.x < -20 ||
        s.y < -20 ||
        s.x > this.area.width + 20 ||
        s.y > this.area.height + 20
      )
        this.shots.splice(i, 1)
    }
    if (!this.drill || ['board', 'melee', 'return'].includes(this.drill)) {
      const wasTouching = this.touching
      const hit = contactStep(p, this.foe, this.crew, this.contact, dt)
      this.touching = hit.touching
      if (hit.damage > 0) {
        if (!this.events.emit('sky:impact', { ...hit.contact, damage: hit.damage })) {
          this.burst(hit.contact, GOLD, 12, 50)
          battleSound('hit')
        }
        this.saveIn = 0
      }
      if (this.drill === 'board' && this.touching) this.teach('melee')
      else if (this.drill === 'melee') {
        // The Watch holds back its final hands until the captain practices shearing away.
        this.crew.player = Math.max(1, this.crew.player)
        this.crew.enemy = Math.max(1, this.crew.enemy)
        if (wasTouching && !this.touching) this.teach('return')
      } else if (this.drill === 'return' && !this.crew.enemy) this.teach('debrief')
      else if (!this.drill) {
        if (wasTouching !== this.touching) {
          this.saveIn = 0
          this.hudIn = 0
        }
        const ending = combatEnding(p, this.foe, this.crew) ?? (atEscapeEdge ? 'escaped' : null)
        if (ending) { this.finish(ending); return }
      }
      if (this.drill) {
        p.hull = Math.max(1, p.hull)
        this.foe.hull = Math.max(1, this.foe.hull)
      }
    }
  }

  update(_time: number, delta: number) {
    if (!this.ready || this.ended || this.pausedDuel) return
    // Bound catch-up after background throttling; use the same physics tick at all display rates.
    const dt = Math.min(.16, delta / 1000)
    const beforeX = this.player.x, beforeY = this.player.y, lesson = this.drill
    this.accumulator += dt
    this.paths.clear()
    while (this.accumulator >= PHYSICS_STEP && !this.ended) {
      this.step(PHYSICS_STEP)
      this.accumulator -= PHYSICS_STEP
    }
    if (this.ended) return
    // Measure actual chart movement after collision and boundary resolution.
    // Reframing the Watch exercise is a placement change, not simulated flight.
    const flew = lesson === this.drill
    this.clouds?.update(dt, flew ? this.player.x - beforeX : 0, flew ? this.player.y - beforeY : 0)
    this.bannerTTL -= dt
    if (this.bannerTTL <= 0 && !this.banner.hidden) this.clearBanner()
    if (this.salvageView) this.paintSalvage()
    else this.traceCourse()
    this.events.emit('sky:ships', { player: this.player, enemy: this.foe })
    this.saveIn -= dt
    if (!this.drill && this.saveIn <= 0) this.save()
    this.syncMarkers()
    this.playerView.update(this.player)
    this.foeView.update(this.foe)
    this.showBoarding(dt)
    this.effects(dt)
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.09
      this.syncHUD()
    }
  }
}
