import { GOODS, PORTS, PORT_IDS, type PortId } from './data'
import { CITY_ECONOMY } from './city-economy'
import { npcAtPort, npcName } from './characters'
import { icon } from './icons'
import {
  boardingStrength,
  commandReadiness,
  encounterId,
  hasCaptainPerk,
  isUnlocked,
  prizeManifest,
  skipperTerms,
  worldAtBerth,
  worldCombatLoad,
  worldOpponent,
  type GameState,
} from './model'
import {
  WORLD_PORTS,
  WORLD_TOWNS,
  WORLD_TOWN_RADIUS,
  nearbyAttackableMerchant,
  moorWorldFlight,
  nearbyWorldSite,
  nearbyDock,
  nearbyHail,
  worldCourse,
  type WorldFlight,
} from './world-flight'
import { WorldFlightSky } from './world-flight-sky'
import { mountFlightMinimap } from './world-flight-minimap'
import { battery, syncBattery } from './battle-battery'
import { armamentLabel, armedSide } from './battle-model'
import { hullContact } from './contact-combat'
import type { BattleSnapshot } from './battle-state'
import { stepCampaignSky, fireWorldRail, pushWorldContact } from './world-combat'
import { raiderToll, tollSettlementLabel } from './raiders'
import { beginAmbience, flightAmbience, soundEnabled, toggleSound } from './audio'
import { worldAir } from './world-flight'
import './battery.css'
import './world-flight.css'

type Site = 'market' | 'shipyard' | 'authority' | 'dockworker' | 'civic'
type Service = Exclude<Site, 'dockworker'> | 'local' | 'log' | 'chart'
type Throttle = 0 | 1 | 2 | 3
type Point = { x: number; y: number }
interface Options {
  state: GameState
  onCheckpoint: (flight: WorldFlight, battle?: BattleSnapshot) => void
  onAttack: (id: string) => void
  onDemandChoice: (choice: 'crowns' | 'cargo' | 'refuse' | 'leave' | 'attack') => void
  onBerthCheckpoint: (flight: WorldFlight) => void
  onWaypoint: (port: PortId) => void
  onHail: (id: string) => void
  onDock: (port: PortId) => void
  onCastOff: () => void
  onService: (view: Service) => void
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
function distanceLabel(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + ' km' : Math.round(n) + ' m'
}
function bearing(a: Point, b: Point) {
  return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][
    (Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) + 8) % 8
  ]
}
function siteName(port: PortId, site: Site) {
  const city = CITY_ECONOMY[port]
  return site === 'market'
    ? city.market
    : site === 'shipyard'
      ? city.yard
      : site === 'civic'
        ? city.institution
        : site === 'dockworker'
          ? 'Speak with ' + npcName(npcAtPort(port, site))
          : npcName(npcAtPort(port, site)) + (port === 'meridian' ? '’s chart office' : '’s office')
}
const siteIcon: Record<Site, string> = {
  market: 'shopping-basket',
  shipyard: 'hammer',
  authority: 'landmark',
  civic: 'sun',
  dockworker: 'message-circle',
}
const htmlEscapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function escapeText(value: string) {
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char])
}
const throttleNames = ['Hove to', 'Ahead slow', 'Cruising', 'Full ahead']

export function mountWorldFlight(host: HTMLElement, options: Options) {
  let state = options.state,
    underway = Boolean(state.voyage?.flight),
    flight = structuredClone(state.voyage?.flight ?? worldAtBerth(state))
  let waypoint: PortId | null | undefined = state.voyage?.waypoint,
    hold = Boolean(waypoint && underway),
    throttle = flight.player.throttle as Throttle
  let time = 0,
    saveTime = 0,
    hudTime = 0,
    frame = 0,
    paused = false,
    dead = false,
    focused: Site | undefined
  let battle = structuredClone(state.voyage?.battle),
    load = worldCombatLoad(state),
    chase = false,
    breakaway = false,
    enemyStrength = battle ? worldOpponent(state).crew : 1
  let steering = 0,
    tied = !underway && Math.hypot(flight.player.vx, flight.player.vy) < 1
  let approach: Site | undefined,
    approachPort: PortId = state.port
  let waiting = '',
    sheetVisible = host.inert
  const held = new Set<string>(),
    stop = new AbortController(),
    reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const root = document.createElement('section')
  root.className = 'flight-world'
  root.setAttribute('aria-label', 'Skyways')
  root.tabIndex = -1
  root.innerHTML = `<canvas aria-label="Overhead flight across the four skyports"></canvas><div class="flight-marks"></div>
    <div class="flight-instruments"><div class="flight-position"><span class="flight-rose">${icon('compass')}</span><div><strong data-f="where"></strong><span data-f="distance"></span></div></div>
      <div class="flight-top-actions"><button data-op="chart" title="Sky chart" aria-label="Sky chart">${icon('map')}</button><button data-op="log" title="Captain’s log" aria-label="Captain’s log">${icon('book-open')}</button><button data-op="pause" title="Pause flight (P)" aria-label="Pause flight" aria-pressed="false"><span class="flight-pause-glyph">Ⅱ</span></button></div></div>
    <div class="flight-bearing" data-f="air"></div><div class="flight-actions"><div class="flight-helm"><button data-turn="-1" aria-keyshortcuts="A ArrowLeft" aria-label="Steer to port">↶</button><button data-op="course" aria-keyshortcuts="C" aria-pressed="false">${icon('compass')}<span>Hold course</span></button><button data-turn="1" aria-keyshortcuts="D ArrowRight" aria-label="Steer to starboard">↷</button></div>
      <div class="flight-throttle"><button data-op="slower" aria-keyshortcuts="S ArrowDown" aria-label="Reduce throttle">−</button><div><strong data-f="throttle"></strong><span data-f="speed"></span></div><button data-op="faster" aria-keyshortcuts="W ArrowUp" aria-label="Increase throttle">+</button></div></div>
    <div class="flight-context"><button data-op="dock"></button><button data-op="hail"></button><button data-op="provoke"></button><button data-op="cast">${icon('sailboat')} Cast off</button><span data-f="locked" hidden></span></div>
    <div class="flight-port-battery" hidden></div><div class="flight-combat-status" aria-live="polite" hidden></div>
    <div class="flight-paused" hidden><strong>Flight paused</strong><p>A / D steers. W / S sets throttle. C holds a course. F docks or hails. M toggles the mini-map.</p><button data-op="sound" aria-label="Flight sound" aria-pressed="false"></button><button data-op="fullscreen" hidden>Full screen</button><button data-op="resume">Resume</button></div>`
  host.replaceChildren(root)
  const minimap = mountFlightMinimap(root, (port) => isUnlocked(state, port))
  const get = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!
  const button = (op: string) => get<HTMLButtonElement>('[data-op="' + op + '"]')
  const read = (key: string) => get<HTMLElement>('[data-f="' + key + '"]')
  const sky = new WorldFlightSky(get<HTMLCanvasElement>('canvas'), flight.player)
  const markLayer = get<HTMLElement>('.flight-marks'),
    marks = new Map<string, HTMLButtonElement>()
  const specs = new Map<string, () => void>(),
    visibleMarks = new Set<string>()
  let w = 0,
    h = 0
  const resize = new ResizeObserver(() => {
    const r = root.getBoundingClientRect()
    w = r.width
    h = r.height
    sky.resize(w, h)
    paint(0)
    hud()
  })
  resize.observe(root)
  function checkpoint() {
    if (!dead) {
      if (underway) options.onCheckpoint(structuredClone(flight), battle && structuredClone(battle))
      else options.onBerthCheckpoint(structuredClone(flight))
    }
    saveTime = 0
  }
  function focusSite(site?: Site) {
    focused = site
  }
  function approachSite(site: Site, port: PortId = state.port) {
    if (!isUnlocked(state, port) || battle) return
    approachPort = port
    if (nearbyWorldSite(flight)?.siteId === site && nearbyWorldSite(flight)?.port === port) {
      if (!underway) moorWorldFlight(flight, port)
      tied = true
      throttle = 0
      service(site === 'dockworker' ? 'local' : site)
      return
    }
    approach = site
    focused = undefined
    tied = false
    throttle = 2
    root.focus({ preventScroll: true })
    hud()
  }
  function service(view: Service) {
    checkpoint()
    if (!underway && view !== 'log' && view !== 'chart') focusSite(view === 'local' ? 'dockworker' : view)
    options.onService(view)
  }
  function selectPort(port: PortId) {
    if (port === waypoint && underway) {
      hold = true
      return
    }
    checkpoint()
    if (!isUnlocked(state, port)) {
      service('chart')
      return
    }
    if (underway) {
      waypoint = port
      hold = true
      options.onWaypoint(port)
    } else service('chart')
  }
  function mark(
    id: string,
    label: string,
    at: Point,
    content: string,
    kind: string,
    action: () => void,
    edge = false,
  ) {
    if (at.x < -64 || at.y < -64 || at.x > w + 64 || at.y > h + 64) {
      if (!edge) return
    }
    let el = marks.get(id)
    if (!el) {
      el = document.createElement('button')
      el.type = 'button'
      el.dataset.mark = id
      el.addEventListener('click', () => specs.get(id)?.(), { signal: stop.signal })
      marks.set(id, el)
      markLayer.append(el)
    }
    visibleMarks.add(id)
    specs.set(id, action)
    el.hidden = false
    el.className = 'flight-mark ' + kind
    if (el.innerHTML !== content) el.innerHTML = content
    if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label)
    el.title = label
    const verticalLimit = underway ? 92 : 66
    let x = at.x,
      y = at.y
    if (edge) {
      const center = { x: w / 2, y: h / 2 },
        dx = x - center.x,
        dy = y - center.y
      const insetX = w < 550 ? 42 : 76,
        factor = Math.min(
          1,
          (center.x - insetX) / Math.max(1, Math.abs(dx)),
          (center.y - verticalLimit) / Math.max(1, Math.abs(dy)),
        )
      x = center.x + dx * factor
      y = center.y + dy * factor
      if (factor < 1) el.classList.add('edge')
    }
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-50%)'
  }
  function bars(name: string, ship: NonNullable<typeof battle>['player'], crew: number, maxCrew: number) {
    const meter = (label: string, symbol: string, current: number, max: number, extra: string) =>
      icon(symbol) +
      '<span class="flight-hp ' +
      extra +
      '" role="meter" aria-label="' +
      label +
      '" aria-valuemin="0" aria-valuemax="' +
      max +
      '" aria-valuenow="' +
      current.toFixed(1) +
      '"><i style="width:' +
      clamp((current / max) * 100, 0, 100) +
      '%"></i></span>'
    name = escapeText(name)
    return (
      '<strong>' +
      name +
      '</strong>' +
      meter(name + ' hull', 'shield', ship.hull, ship.maxHull, '') +
      meter(name + ' crew', 'users', crew, maxCrew, 'crew')
    )
  }
  function updateMarks() {
    visibleMarks.clear()
    const nearbyPort = underway
      ? PORT_IDS.find((port) => distance(flight.player, WORLD_TOWNS[port].center) < 460)
      : state.port
    if (nearbyPort && !battle && (!underway || state.voyage?.phase === 'underway')) {
      for (const site of WORLD_TOWNS[nearbyPort].sites) {
        const id = site.id as Site,
          label = siteName(nearbyPort, id),
          at = sky.project(site.position)
        mark(
          'site-' + id,
          label,
          at,
          icon(siteIcon[id]) + '<span>' + label + '</span>',
          'site' + (focused === id || approach === id ? ' active' : ''),
          () => approachSite(id, nearbyPort),
        )
      }
    }
    if (underway) {
      const nearbyBearings =
        waypoint || battle
          ? []
          : [...PORT_IDS]
              .filter((id) => isUnlocked(state, id))
              .sort((a, b) => distance(flight.player, WORLD_PORTS[a]) - distance(flight.player, WORLD_PORTS[b]))
              .slice(0, 2)
      for (const port of PORT_IDS) {
        const point = WORLD_PORTS[port],
          d = distance(flight.player, point),
          selected = port === waypoint
        const reference = nearbyBearings.includes(port)
        if (!selected && !reference && d > 570) continue
        const at = sky.project(point)
        at.y -= 35
        const short = PORTS[port].name.split(' ')[0],
          label = PORTS[port].name + ' · ' + bearing(flight.player, point) + ' · ' + distanceLabel(d)
        mark(
          'port-' + port,
          label,
          at,
          icon(selected ? 'compass' : 'anchor') +
            '<span>' +
            short +
            (selected || reference ? ' · ' + bearing(flight.player, point) + ' ' + distanceLabel(d) : '') +
            '</span>',
          'port' + (selected ? ' selected' : ''),
          () => selectPort(port),
          selected || reference,
        )
      }
      for (const actor of flight.traffic) {
        const d = distance(flight.player, actor.ship)
        if (d > 480 || actor.id === battle?.worldActor) continue
        const at = sky.project(actor.ship)
        at.y -= 29
        const text = actor.name + ' · ' + distanceLabel(d)
        mark(
          'ship-' + actor.id,
          text,
          at,
          icon(actor.kind === 'raider' ? 'flag' : 'sailboat') + '<span>' + escapeText(actor.name) + '</span>',
          'traffic ' + actor.kind,
          () => {
            if (nearbyHail(flight, true)?.id === actor.id) hail(actor.id)
          },
          d < 300,
        )
      }
      if (battle) {
        const p = sky.project(flight.player),
          q = sky.project(battle.enemy),
          close = Math.hypot(q.x - p.x, q.y - p.y) < 100,
          name = flight.traffic.find((t) => t.id === battle?.worldActor)?.name ?? 'Opponent'
        p.y += close ? 31 : -36
        q.y -= 36
        p.x -= close ? 28 : 0
        q.x += close ? 30 : 0
        mark(
          'fight-player',
          'Your ship status',
          p,
          bars('You', battle.player, battle.playerCrew, boardingStrength(state)),
          'combat',
          () => pause(true),
        )
        mark(
          'fight-enemy',
          name + ' status',
          q,
          bars(name, battle.enemy, battle.enemyCrew, enemyStrength),
          'combat',
          () => pause(true),
          true,
        )
      }
    }
    for (const [id, el] of marks) if (!visibleMarks.has(id)) el.hidden = true
  }
  let fitted = 0,
    lastNotice = ''
  function combatHud() {
    const box = get<HTMLElement>('.flight-port-battery'),
      status = get<HTMLElement>('.flight-combat-status'),
      leg = state.voyage
    box.hidden = !battle || !!battle.terminal
    if (battle && !box.hidden) {
      if (fitted !== battle.player.guns.length) {
        fitted = battle.player.guns.length
        box.innerHTML =
          battery('port', fitted) +
          battery('starboard', fitted) +
          '<button data-op="grapple" aria-keyshortcuts="B">Close in</button><button data-op="evade" aria-keyshortcuts="R">Break away</button>'
      }
      for (const side of ['port', 'starboard'] as const) {
        const btn = box.querySelector<HTMLButtonElement>('[data-action=' + side + ']')
        if (btn) syncBattery(btn, side, battle.player.guns, paused, false)
      }
      get<HTMLButtonElement>('[data-op=grapple]').textContent =
        hullContact(battle.player, battle.enemy).gap < 5 ? 'Push off' : chase ? 'Cancel close' : 'Close in'
      get<HTMLButtonElement>('[data-op=evade]').textContent = breakaway ? 'Cancel escape' : 'Break away'
    }
    const name = escapeText(flight.traffic.find((a) => a.id === leg?.hailed)?.name ?? 'Passing ship')
    const action = (op: string, label: string, disable = false) =>
      '<button data-op="' + op + '" ' + (disable ? 'disabled' : '') + '>' + label + '</button>'
    let message = ''
    if (leg?.phase === 'raider' && leg.pirate) {
      const toll = raiderToll(state)
      const foe = toll.profile
      const id = encounterId(leg)
      const cargo = prizeManifest(state, foe.id, id)
      const skipper = skipperTerms(state, id)
      const judgment = hasCaptainPerk(state, 'readRoom')
        ? ' ' + skipper.evidence + ' Chance of signing articles: ' + Math.round(skipper.chance * 100) + '%.'
        : ''
      message =
        '<strong>' +
        name +
        (toll.crowns ? ' demands ' + toll.crowns + ' crowns' : ' offers clear passage') +
        '</strong><div>' +
        action('crowns', toll.crowns ? 'Pay ' + toll.crowns : 'Accept passage', state.coins < toll.crowns) +
        (toll.settlement.cargo.length
          ? action('cargo', tollSettlementLabel(toll.settlement), toll.exposedValue < toll.crowns)
          : '') +
        action('refuse', 'Refuse') +
        '</div>' +
        `<details class="flight-appraisal"><summary>Appraise ship</summary><div>
          <p>${foe.name} · ${armamentLabel(foe.cannons)} · ${foe.hull} hull. Their crew strength is ${foe.crew}. Yours is ${Number(boardingStrength(state).toFixed(2))}.</p>
          <p>Their hold carries ${cargo.quantity} crates of ${GOODS[cargo.good].name.toLowerCase()}. ${commandReadiness(state)}</p>
          <p>${skipper.motive}${judgment}</p>
          <p>Yielding costs ${tollSettlementLabel(toll.settlement)}. Papers and bonded mail stay aboard.</p>
        </div></details>`
    } else if (leg?.phase === 'merchant')
      message =
        '<strong>' +
        name +
        ' answers your hail</strong><div>' +
        action('leave', 'Pass peacefully') +
        action('attack', 'Attack merchant') +
        '</div>'
    else if (battle?.salvage?.remaining) {
      const salvage = battle.salvage
      message =
        '<strong>Falling cargo · ' +
        Math.ceil(salvage.remaining) +
        ' s</strong><div>' +
        salvage.crates.filter((c) => c.taken).length +
        ' / ' +
        salvage.crates.length +
        ' recovered ' +
        action('skip-salvage', 'Leave cargo') +
        '</div>'
    }
    if (message !== lastNotice) {
      lastNotice = message
      status.innerHTML = message
    }
    status.hidden = !message
  }
  function hud() {
    const p = flight.player,
      near = underway ? nearbyDock(flight) : undefined,
      contact = underway ? nearbyHail(flight, true) : undefined
    if (!underway) {
      read('where').textContent = PORTS[state.port].name
      read('distance').textContent = CITY_ECONOMY[state.port].district
    } else if (waypoint) {
      const pin = WORLD_PORTS[waypoint]
      read('where').textContent = PORTS[waypoint].name
      read('distance').textContent = bearing(p, pin) + ' · ' + distanceLabel(distance(p, pin))
    } else {
      read('where').textContent = 'Open sky'
      read('distance').textContent = 'Free flight'
    }
    read('air').textContent =
      flight.weather.knots + ' kn ' + flight.weather.bearing + ' · ' + flight.weather.summary
    read('throttle').textContent = throttleNames[throttle]
    read('speed').textContent = Math.round(Math.hypot(p.vx, p.vy)) + ' m/s'
    root.classList.toggle('moored', !underway)
    button('course').setAttribute('aria-pressed', String(hold))
    button('course').disabled = !waypoint
    button('course').title = hold ? 'Release held course (C)' : 'Hold the selected course (C)'
    button('slower').disabled = throttle === 0
    button('faster').disabled = throttle === 3
    button('cast').hidden = underway
    button('dock').hidden = !near || !isUnlocked(state, near)
    button('hail').hidden = !contact
    if (near) button('dock').textContent = 'Dock at ' + PORTS[near].name
    if (contact)
      button('hail').textContent = 'Hail ' + (flight.traffic.find((a) => a.id === contact.id)?.name ?? 'ship')
    read('locked').hidden = !near || isUnlocked(state, near)
    if (near && !isUnlocked(state, near))
      read('locked').textContent = PORTS[near].name + ' · clearance at level ' + PORTS[near].requiredLevel
    if (state.voyage?.phase !== 'underway') {
      button('dock').hidden = true
      button('hail').hidden = true
    }
    const merchant = state.voyage?.phase === 'underway' && nearbyAttackableMerchant(flight)
    button('provoke').hidden = !merchant
    if (merchant) button('provoke').textContent = 'Attack ' + merchant.name
    const fullscreen = button('fullscreen')
    fullscreen.hidden = !document.fullscreenEnabled
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'
    const audio = button('sound')
    if (audio.getAttribute('aria-pressed') !== String(soundEnabled()) || !audio.textContent) {
      audio.setAttribute('aria-pressed', String(soundEnabled()))
      audio.innerHTML =
        icon(soundEnabled() ? 'volume-2' : 'volume-x') + (soundEnabled() ? 'Sound on' : 'Sound off')
    }
    const air = worldAir(flight, p)
    flightAmbience(Math.hypot(p.vx - air.wind.x, p.vy - air.wind.y), air.gust, tied, paused || document.hidden)
    updateMarks()
    combatHud()
  }
  function paint(dt: number) {
    sky.render(
      flight,
      dt,
      reduced.matches,
      underway ? undefined : { port: state.port, site: focused },
      battle,
      state.ship.cannons,
      !!state.garden,
    )
    minimap.update(flight, waypoint, underway)
  }
  function pause(value: boolean) {
    paused = value
    held.clear()
    steering = 0
    get<HTMLElement>('.flight-paused').hidden = !value
    button('pause').setAttribute('aria-pressed', String(value))
    button('pause').setAttribute('aria-label', value ? 'Resume flight' : 'Pause flight')
    if (value) {
      checkpoint()
      button('resume').focus()
    } else root.focus({ preventScroll: true })
  }
  function hail(id: string) {
    if (waiting === id) return
    waiting = id
    checkpoint()
    options.onHail(id)
  }
  function dock() {
    const near = nearbyDock(flight)
    if (near && isUnlocked(state, near)) {
      checkpoint()
      options.onDock(near)
    }
  }
  function act(op: string) {
    if (host.inert || dead) return
    if (op === 'fullscreen') {
      if (document.fullscreenEnabled) {
        const change = document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen()
        void change.then(hud).catch(() => {})
      }
      return
    }
    if (op === 'sound') {
      toggleSound()
      hud()
      return
    }
    beginAmbience()
    if (op === 'provoke') {
      const merchant = nearbyAttackableMerchant(flight)
      if (merchant && !paused && state.voyage?.phase === 'underway') {
        checkpoint()
        options.onAttack(merchant.id)
      }
      return
    }
    if (op === 'pause' || op === 'resume') {
      pause(op === 'resume' ? false : !paused)
      return
    }
    if (paused) return
    if (['crowns', 'cargo', 'refuse', 'leave', 'attack'].includes(op)) {
      checkpoint()
      options.onDemandChoice(op as 'crowns' | 'cargo' | 'refuse' | 'leave' | 'attack')
      return
    }
    if (op === 'skip-salvage' && battle?.salvage) {
      battle.salvage.remaining = 0
      checkpoint()
      return
    }
    if (battle && !battle.terminal) {
      if (op === 'port' || op === 'starboard' || op === 'fire') {
        const side = op === 'fire' ? armedSide(battle.player, battle.enemy) : op
        fireWorldRail(flight, battle, side, state.ship.guns)
        hud()
        return
      }
      if (op === 'grapple') {
        if (!pushWorldContact(flight, battle)) chase = !chase
        else chase = false
        breakaway = false
        hold = false
        if (chase) throttle = 3
        return
      }
      if (op === 'evade') {
        breakaway = !breakaway
        chase = false
        hold = false
        if (breakaway) throttle = 3
        return
      }
    }
    if (op === 'chart' || op === 'log') {
      service(op)
      return
    }
    if (op === 'cast') {
      checkpoint()
      options.onCastOff()
      return
    }
    if (op === 'dock') dock()
    if (op === 'hail') {
      const c = nearbyHail(flight, true)
      if (c) hail(c.id)
    }
    if (op === 'course') {
      if (waypoint) {
        hold = !hold
        if (hold && throttle === 0) throttle = 2
      } else service('chart')
    }
    if (op === 'faster' || op === 'slower') {
      throttle = clamp(throttle + (op === 'faster' ? 1 : -1), 0, 3) as Throttle
      tied = false
      approach = undefined
      focused = undefined
    }
    hud()
  }
  root.addEventListener(
    'click',
    (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-op]')
      if (target) act(target.dataset.op!)
      else {
        const gun = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
        if (gun) act(gun.dataset.action!)
      }
    },
    { signal: stop.signal },
  )
  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-turn]')) {
    btn.onpointerdown = (e) => {
      if (paused || host.inert) return
      btn.setPointerCapture(e.pointerId)
      steering = Number(btn.dataset.turn)
      hold = false
      chase = false
      breakaway = false
      tied = false
      approach = undefined
      focused = undefined
      hud()
    }
    btn.onpointerup =
      btn.onpointercancel =
      btn.onlostpointercapture =
        () => {
          steering = 0
        }
  }
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        host.inert ||
        root.closest('[inert]') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      const k = e.key.toLowerCase()
      if (
        ![
          'a',
          'd',
          'arrowleft',
          'arrowright',
          'w',
          's',
          'arrowup',
          'arrowdown',
          'c',
          'f',
          'p',
          'q',
          'e',
          ' ',
          'b',
          'r',
        ].includes(k)
      )
        return
      e.preventDefault()
      if (e.repeat) return
      if (k === 'p') act('pause')
      else if (['q', 'e', ' ', 'b', 'r'].includes(k)) {
        if (battle)
          act(({ q: 'port', e: 'starboard', ' ': 'fire', b: 'grapple', r: 'evade' } as Record<string, string>)[k])
      } else if (!paused) {
        if (['a', 'arrowleft', 'd', 'arrowright'].includes(k)) {
          held.add(k)
          hold = false
          chase = false
          breakaway = false
          tied = false
          approach = undefined
          focused = undefined
        } else if (k === 'c') act('course')
        else if (k === 'f') act(nearbyHail(flight, true) ? 'hail' : 'dock')
        else act(k === 'w' || k === 'arrowup' ? 'faster' : 'slower')
      }
    },
    { signal: stop.signal },
  )
  window.addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()), { signal: stop.signal })
  const suspend = () => {
    flightAmbience(0, 0, tied, true)
    held.clear()
    steering = 0
    time = 0
    checkpoint()
  }
  window.addEventListener('blur', suspend, { signal: stop.signal })
  window.addEventListener('pagehide', suspend, { signal: stop.signal })
  document.addEventListener(
    'visibilitychange',
    () => {
      suspend()
    },
    { signal: stop.signal },
  )
  function tick(now: number) {
    if (dead) return
    frame = requestAnimationFrame(tick)
    if (document.hidden || !w || !h) {
      time = 0
      return
    }
    const dt = time ? Math.min(0.09, (now - time) / 1000) : 0
    time = now
    if (!paused && !host.inert && dt > 0) {
      const p = flight.player,
        local = approach && WORLD_TOWNS[approachPort].sites.find((s) => s.id === approach),
        goal =
          battle && (chase || breakaway)
            ? chase
              ? battle.enemy
              : { x: 2 * p.x - battle.enemy.x, y: 2 * p.y - battle.enemy.y }
            : local
              ? local.berth
              : waypoint && WORLD_PORTS[waypoint]
      let helm =
        steering + Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      let ordered = throttle
      if ((hold || local || chase || breakaway) && goal) {
        const via = worldCourse(p, goal),
          desired = Math.atan2(via.y - p.y, via.x - p.x),
          err = Math.atan2(Math.sin(desired - p.heading), Math.cos(desired - p.heading))
        helm = clamp(err * 1.6 - p.angularSpeed * 0.7, -1, 1)
        const range = distance(p, goal)
        if (local) {
          ordered = Math.abs(err) > 1.1 ? 0 : range < 95 ? 1 : 2
        } else if (chase || breakaway) ordered = 3
        else if (range < 105) ordered = 0
        else if (range < 240) ordered = Math.min(ordered, 1) as Throttle
      }
      const mooring = tied ? { ...p } : undefined
      stepCampaignSky(flight, { helm: clamp(helm, -1, 1), throttle: ordered }, dt, battle, state.ship.guns, load)
      sky.combatFx.observe(flight, battle)
      if (mooring) Object.assign(p, mooring)
      saveTime += dt
      if (saveTime >= (tied ? 3 : 0.32) || (battle?.terminal && !battle.salvage?.remaining)) checkpoint()
      const site = approach && nearbyWorldSite(flight)
      if (approach && site?.siteId === approach && site.port === approachPort) {
        const arrived = approach
        approach = undefined
        if (!underway) moorWorldFlight(flight, approachPort)
        tied = !underway
        throttle = 0
        service(arrived === 'dockworker' ? 'local' : arrived)
      } else if (!underway) {
        if (distance(p, WORLD_TOWNS[state.port].center) > WORLD_TOWN_RADIUS && waiting !== 'cast') {
          waiting = 'cast'
          checkpoint()
          options.onCastOff()
        }
      } else if (state.voyage?.phase === 'underway') {
        const contact = nearbyHail(flight)
        if (contact) hail(contact.id)
      }
    }
    paint(paused ? 0 : dt)
    hudTime += dt
    if (hudTime >= 0.1) {
      hudTime = 0
      hud()
    }
  }
  frame = requestAnimationFrame(tick)
  hud()
  return {
    focusSite,
    approachSite,
    update(next: GameState) {
      if (sheetVisible && !host.inert) focused = undefined
      sheetVisible = host.inert
      const prev = state,
        was = underway
      state = next
      underway = Boolean(next.voyage?.flight)
      const changed = was !== underway || prev.voyage?.id !== next.voyage?.id || prev.port !== next.port
      if (prev.voyage?.phase !== next.voyage?.phase || prev.voyage?.hailed !== next.voyage?.hailed || changed) {
        battle = structuredClone(next.voyage?.battle)
        enemyStrength = battle ? worldOpponent(next).crew : 1
        load = worldCombatLoad(next)
        if (next.voyage?.flight) flight = structuredClone(next.voyage.flight)
        chase = false
        breakaway = false
        waiting = ''
      }
      if (changed) {
        flight = structuredClone(next.voyage?.flight ?? worldAtBerth(next))
        waypoint = next.voyage?.waypoint
        hold = Boolean(waypoint && underway)
        throttle = flight.player.throttle as Throttle
        focused = undefined
        approach = undefined
        tied = !underway && Math.hypot(flight.player.vx, flight.player.vy) < 1
        waiting = ''
        held.clear()
        steering = 0
      } else if (underway && next.voyage?.flight) {
        if (waiting && next.voyage.phase === 'underway' && next.voyage.flight.spentIds.includes(waiting)) {
          flight = structuredClone(next.voyage.flight)
          waiting = ''
        }
        if (waypoint !== next.voyage.waypoint) {
          waypoint = next.voyage.waypoint
          hold = Boolean(waypoint)
        }
      }
      hud()
    },
    destroy() {
      if (dead) return
      checkpoint()
      dead = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      stop.abort()
      minimap.destroy()
      sky.destroy()
      root.remove()
    },
  }
}
