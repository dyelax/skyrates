import { cargoUsed, PORTS, type GameState, type PortId } from './model'
import { CITY_ECONOMY } from './city-economy'
import { icon } from './icons'
import { mountDockTalk } from './dock-talk'
import type { HarborWorld } from './voxel/harbor-world'
import './voxel/harbor.css'
import { bell, soundEnabled, toggleSound } from './audio'
import type { InteriorView } from './interiors'

type Place = 'market' | 'local' | 'authority' | 'ship' | 'shipyard' | 'civic'
// Boxes and pins are percentages of the painted plate, independent of the viewport.
type Zone = [left: number, top: number, right: number, bottom: number, pinX: number, pinY: number]
interface Quay {
  region: string
  weather: string
  local: string
  role: string
  zones: Record<Place, Zone>
}
const quays: Record<PortId, Quay> = {
  sunstep: {
    region: 'The Inner Reaches',
    weather: 'Clear skies',
    local: 'Moss Pellar',
    role: 'Orchard porter',
    zones: {
      civic: [5, 20, 25, 36, 19, 30],
      market: [1, 37, 24, 85, 14, 62],
      local: [26, 57, 36, 95, 30, 64],
      authority: [25, 16, 53, 64, 42, 47],
      ship: [54, 25, 78, 64, 65, 49],
      shipyard: [79, 20, 99, 74, 90, 52],
    },
  },
  glasshouse: {
    region: 'The Inner Reaches',
    weather: 'Violet haze',
    local: 'Sella Venn',
    role: 'Master glazier',
    zones: {
      civic: [3, 14, 25, 30, 16, 24],
      market: [1, 32, 28, 67, 15, 49],
      local: [19, 59, 32, 98, 24, 65],
      authority: [35, 7, 59, 65, 48, 48],
      ship: [59, 19, 79, 62, 70, 45],
      shipyard: [80, 20, 99, 76, 90, 49],
    },
  },
  copperfall: {
    region: 'The Inner Reaches',
    weather: 'Fair winds',
    local: 'Skipper Neri',
    role: 'Tender skipper',
    zones: {
      civic: [3, 15, 26, 30, 17, 23],
      market: [1, 30, 23, 86, 14, 57],
      local: [22, 55, 32, 94, 27, 63],
      authority: [27, 14, 58, 69, 44, 47],
      ship: [59, 20, 74, 68, 66, 47],
      shipyard: [75, 13, 99, 77, 89, 49],
    },
  },
  meridian: {
    region: 'The Outer Reaches',
    weather: 'High cirrus',
    local: 'Pilot Sen',
    role: 'Weather pilot',
    zones: {
      civic: [39, 9, 55, 23, 46, 18],
      market: [1, 30, 25, 81, 13, 55],
      local: [23, 58, 34, 95, 28, 64],
      authority: [28, 13, 58, 68, 44, 46],
      ship: [57, 20, 78, 67, 68, 49],
      shipyard: [79, 17, 99, 78, 90, 52],
    },
  },
}
const glyphs: Record<Place, string> = {
  civic: 'compass',
  market: 'shopping-basket',
  local: 'message-circle',
  authority: 'scroll-text',
  ship: 'sailboat',
  shipyard: 'hammer',
}
const places: Place[] = ['market', 'authority', 'ship', 'shipyard', 'local', 'civic']

function placeDetails(s: GameState, place: Place): [string, string, string] {
  switch (place) {
    case 'market': {
      const name = CITY_ECONOMY[s.port].market
      return [name, 'Trade cargo', 'Visit Port Market · ' + name]
    }
    case 'civic': {
      const name = CITY_ECONOMY[s.port].institution
      return [name, 'Local institution', 'Visit ' + name]
    }
    case 'local':
      return [quays[s.port].local, quays[s.port].role, 'Talk to ' + quays[s.port].local]
    case 'authority':
      return [
        PORTS[s.port].keeper,
        s.port === 'sunstep' && s.mission === 'offered' ? 'Commission available' : 'Port authority',
        'Visit Port Authority · ' + PORTS[s.port].keeper,
      ]
    case 'ship':
      return ['The Wayfarer', 'Board your schooner', 'Board The Wayfarer']
    case 'shipyard':
      return [CITY_ECONOMY[s.port].yard, 'Refit & recruit', 'Visit Shipyard · ' + CITY_ECONOMY[s.port].yard]
  }
}
function spot(s: GameState, place: Place): string {
  const [left, top, right, bottom, x, y] = quays[s.port].zones[place]
  const [name, hint, accessible] = placeDetails(s, place)
  const relevant =
    place === 'authority' &&
    ((s.port === 'sunstep' && s.mission === 'offered') || (s.port === 'glasshouse' && s.mission === 'invoice'))
  return `<button type="button" class="quay-spot ${place === 'local' ? 'person' : ''} ${relevant ? 'commission-spot' : ''}" data-place="${place}"
      aria-label="${accessible}" style="--l:${left}%;--t:${top}%;--w:${right - left}%;--h:${bottom - top}%;--x:${((x - left) * 100) / (right - left)}%;--y:${((y - top) * 100) / (bottom - top)}%">
      <span class="hover-zone"></span><span class="place-pin">${icon(glyphs[place])}</span>
      <span class="place-label"><b>${name}</b><small>${hint}</small></span>
    </button>`
}

export function mountHarbor(
  main: HTMLElement,
  state: GameState,
  navigate: (view: InteriorView) => void,
): () => void {
  const quay = quays[state.port]
  const lit = state.mission === 'lit' && ['sunstep', 'glasshouse'].includes(state.port)
  const scenery = 'art/quay-' + state.port + (lit ? '-lit' : '') + '.webp'
  main.innerHTML = `<section class="quay" aria-label="${PORTS[state.port].name} harbor">
    <div class="walk-view"><canvas aria-label="Walkable 3D harbor. Walk with W A S D, drag to look, or tap the paving to walk."></canvas></div>
    <div class="quay-scroll" tabindex="-1"><div class="quay-track"><div class="quay-plate">
      <img class="quay-art" alt="The working docks at ${PORTS[state.port].name}" src="${scenery}" fetchpriority="high">
      ${places.map((place) => spot(state, place)).join('')}
    </div></div></div>
    <div class="quay-shade" aria-hidden="true"></div>
    <header class="quay-title"><span class="quay-region"><i></i>${quay.region}</span><h1>${PORTS[state.port].name}</h1>
      <p>${icon(lit ? 'sunset' : 'sun')}<span>Day ${String(state.day).padStart(2, '0')}</span><i></i>${lit ? 'Night watch' : quay.weather}</p></header>
    <div class="pocket"><span class="coin-readout" title="Available crowns">${icon('coins')} <b>${state.coins.toLocaleString('en-US')}</b><span>crowns</span></span><button class="scene-tool" type="button" data-tool="settings" aria-label="Game options" title="Game options">${icon('settings-2')}</button></div>
    <div class="field-tools"><button class="chart-tool" type="button" data-go="chart" aria-label="Sky chart"><img src="compass.svg" alt=""><span>Sky chart</span></button>
      <button class="scene-tool journal-tool" type="button" data-go="log" aria-label="Captain’s log" title="Captain’s log">${icon('book-open')}</button></div>
    <button class="discover" type="button" data-tool="labels" aria-pressed="false" title="Toggle place names (H)">${icon('scan-eye')}<span>Show places</span><kbd>H</kbd></button>
    <div class="walk-help"><span class="walk-instructions">WASD walk · Drag to look · Click paving to walk</span><button data-home type="button" aria-label="Return to the landing" title="Return to the landing (Home)">⌂</button></div>
    <div class="pan-hints"><button type="button" aria-label="Pan left" data-pan="-1">‹</button><button type="button" aria-label="Pan right" data-pan="1">›</button></div>
    <div class="quay-overlay" hidden></div></section>`
  const scene = main.querySelector<HTMLElement>('.quay')!
  const scroller = scene.querySelector<HTMLElement>('.quay-scroll')!
  const track = scene.querySelector<HTMLElement>('.quay-track')!
  const overlay = scene.querySelector<HTMLElement>('.quay-overlay')!
  const labels = scene.querySelector<HTMLButtonElement>('[data-tool="labels"]')!
  const plate = scene.querySelector<HTMLElement>('.quay-plate')!
  let returnTo: HTMLElement | null = null
  let scrollFraction = 0.5
  const resize = new ResizeObserver(() => {
    const excess = track.offsetWidth - scroller.clientWidth
    scene.classList.toggle('pannable', excess > 70)
    scroller.scrollLeft = excess * scrollFraction
  })
  resize.observe(scroller)
  scroller.addEventListener(
    'scroll',
    () => {
      const excess = track.offsetWidth - scroller.clientWidth
      if (excess > 0) scrollFraction = scroller.scrollLeft / excess
    },
    { passive: true },
  )
  let world: HarborWorld | null = null
  let closed = false
  if (state.firstWatch !== 'new' || state.day !== 1)
    void import('./voxel/harbor-world')
      .then(({ mountWorld }) => {
        if (closed) return
        world = mountWorld(scene, state, (place) => {
          scene.querySelector<HTMLButtonElement>('[data-place="' + place + '"]')?.click()
        })
      })
      .catch(() => {
        if (!closed) {
          const help = scene.querySelector<HTMLElement>('.walk-instructions')!
          scene.classList.add('illustrated-mode')
          help.textContent = 'Illustrated harbor · 3D rendering unavailable'
        }
      })

  function labelsOn() {
    const show = scene.classList.toggle('show-places')
    labels.setAttribute('aria-pressed', String(show))
    labels.querySelector('span')!.textContent = show ? 'Hide places' : 'Show places'
  }
  function closePanel() {
    overlay.replaceChildren()
    overlay.hidden = true
    scene.classList.remove('reading')
    returnTo?.focus({ preventScroll: true })
    returnTo = null
  }
  function openPanel(from: HTMLElement) {
    returnTo = from
    overlay.hidden = false
    scene.classList.add('reading')
  }
  function settings() {
    overlay.innerHTML = `<section class="pocket-menu" role="dialog" aria-label="Game options"><div class="popover-top"><h2>Game options</h2><button data-close aria-label="Close options">${icon('x')}</button></div>
      <button class="menu-line" data-sound>${icon(soundEnabled() ? 'volume-2' : 'volume-x')} Sound <b>${soundEnabled() ? 'On' : 'Off'}</b></button>
      ${document.fullscreenEnabled ? `<button class="menu-line" data-full>${icon(document.fullscreenElement ? 'shrink' : 'expand')} ${document.fullscreenElement ? 'Leave fullscreen' : 'Enter fullscreen'}</button>` : ''}
      <p class="device-save">${icon('check')} ${main.dataset.saved === 'false' ? 'Storage unavailable' : 'Progress saved on this device'}</p></section>`
    overlay.querySelector<HTMLElement>('[data-close]')!.focus({ preventScroll: true })
  }
  function manifest() {
    const hull = Math.round((state.ship.hull / state.ship.maxHull) * 100)
    overlay.innerHTML = `<section class="vessel-sheet" role="dialog" aria-labelledby="vessel-name"><div class="popover-top"><span class="ink-label">Ship’s papers</span><button type="button" data-close aria-label="Close ship manifest">${icon('x')}</button></div>
      <img src="art/kestrel.webp" alt="Solar-sail schooner in profile"><h2 id="vessel-name">The Wayfarer</h2><p>Lift-keel schooner</p>
      <dl><div><dt>${icon('shield')} Hull</dt><dd>${hull}%</dd></div><div><dt>${icon('package')} Hold</dt><dd>${cargoUsed(state)} / ${state.ship.hold}</dd></div><div><dt>${icon('users')} Crew</dt><dd>${state.ship.crew} hands</dd></div></dl>
      <button type="button" class="gold-action" data-go="chart">${icon('compass')} Plot a course ${icon('arrow-right')}</button></section>`
    overlay.querySelector<HTMLElement>('[data-close]')!.focus({ preventScroll: true })
  }
  function click(ev: MouseEvent) {
    if (!(ev.target instanceof Element)) return
    const button = ev.target.closest<HTMLButtonElement>('button')
    if (!button) {
      if (ev.target === overlay) closePanel()
      return
    }
    const { place, go, tool, pan } = button.dataset
    if (go) {
      navigate(go as InteriorView)
      return
    }
    if (place === 'local') {
      openPanel(button)
      bell('select')
      mountDockTalk(overlay, state, closePanel)
      return
    }
    if (place === 'ship') {
      openPanel(button)
      bell('select')
      manifest()
      return
    }
    if (place) {
      navigate(place as InteriorView)
      return
    }
    if (tool === 'labels') labelsOn()
    if (tool === 'settings') {
      openPanel(button)
      settings()
    }
    if (pan)
      scroller.scrollBy({
        left: Number(pan) * scroller.clientWidth * 0.56,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
    if ('close' in button.dataset) closePanel()
    if ('sound' in button.dataset) {
      toggleSound()
      settings()
      overlay.querySelector<HTMLElement>('[data-sound]')?.focus()
    }
    if ('full' in button.dataset) {
      const task = document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen()
      void task.then(closePanel).catch(() => settings())
    }
  }
  function keyboard(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || document.querySelector('dialog[open]')) return
    if (!overlay.hidden) {
      if (ev.key === 'Escape') {
        ev.preventDefault()
        closePanel()
        return
      }
      if (ev.key === 'Tab') {
        const focus = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        if (focus.length && ev.shiftKey && focus[0] === document.activeElement) {
          ev.preventDefault()
          focus.at(-1)?.focus()
        } else if (focus.length && !ev.shiftKey && focus.at(-1) === document.activeElement) {
          ev.preventDefault()
          focus[0].focus()
        }
      }
      return
    }
    if (ev.code === 'KeyH') {
      ev.preventDefault()
      labelsOn()
    }
    if (ev.code === 'KeyM') {
      ev.preventDefault()
      navigate('chart')
    }
    if (ev.code === 'KeyJ') {
      ev.preventDefault()
      navigate('log')
    }
  }
  // Tabbing to a person on a narrow display pans the painted scene with its marker.
  plate.addEventListener('focusin', (ev) => {
    if (!(ev.target instanceof HTMLButtonElement) || !ev.target.matches(':focus-visible')) return
    if (world) {
      if (ev.target.classList.contains('pin-outside')) world.framePlace(ev.target.dataset.place as Place)
      return
    }
    if (!scene.classList.contains('pannable')) return
    const marker = ev.target.querySelector('.place-pin')?.getBoundingClientRect()
    if (marker && (marker.left < 35 || marker.right > scroller.clientWidth - 35))
      scroller.scrollBy({ left: marker.left + marker.width / 2 - scroller.clientWidth / 2 })
  })
  scene.addEventListener('click', click)
  document.addEventListener('keydown', keyboard)
  return () => {
    resize.disconnect()
    closed = true
    world?.dispose()
    document.removeEventListener('keydown', keyboard)
    scene.removeEventListener('click', click)
  }
}
