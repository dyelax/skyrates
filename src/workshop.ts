import { artwork } from './artwork'
import { CITY_ECONOMY } from './city-economy'
import { npcAtPort, npcName, type ContactWriter } from './characters'
import { mountStationTalk } from './dock-talk'
import { icon } from './icons'
import { renderInterior, type InteriorView } from './interiors'
import { PORTS, type Command, type GameState } from './model'
import type { openRoomWorld } from './voxel/workroom-world'
import type { RoomTarget, Station } from './voxel/workroom-plan'
import './workshop.css'

const counterNames: Record<Station, string> = {
  market: 'Cargo ledger',
  shipyard: 'Refits & crew',
  authority: 'Commission papers',
  civic: 'Local work',
}
export interface Workshop {
  key: string
  refresh(): void
  dispose(): void
}
export function mountWorkshop(
  host: HTMLElement,
  station: Station,
  current: () => GameState,
  act: (cmd: Command) => void,
  navigate: (view: InteriorView | 'harbor') => void,
  recordContact: ContactWriter,
): Workshop {
  const state = current(),
    port = state.port,
    city = CITY_ECONOMY[port],
    npc = npcAtPort(port, station)
  const title = {
    market: city.market,
    shipyard: city.yard,
    authority: PORTS[port].keeper + '’s office',
    civic: city.institution,
  }[station]
  const guest = npcAtPort(port, 'civic')
  const labels: Record<RoomTarget, string> = {
    counter: counterNames[station],
    worker: npcName(npc),
    guest: npcName(guest),
    door: 'Harbor door',
  }
  const marks: Record<RoomTarget, string> = {
    counter: 'book-open',
    worker: 'message-circle',
    guest: 'message-circle',
    door: 'log-out',
  }
  const section = document.createElement('section')
  section.className = 'atelier'
  section.setAttribute('aria-label', title)
  section.style.setProperty('--arrival-art', `url("${artwork('civic-' + port)}")`)
  section.innerHTML = `<div class="atelier-view"><canvas aria-label="Walk around the workshop with WASD, drag to look, or tap the floor to walk."></canvas></div>
    <div class="atelier-caption"><small>${PORTS[port].name}</small><h1>${title}</h1></div>
    <button type="button" data-quay class="atelier-back" aria-label="Return to harbor">${icon('arrow-left')} Harbor</button>
    <div class="atelier-places">${(['worker', 'counter', 'door', ...(station === 'market' ? ['guest' as const] : [])] as const).map((target) => `<button type="button" data-place="${target}" class="station-pin" aria-label="${target === 'worker' || target === 'guest' ? 'Talk to ' : target === 'counter' ? 'Open ' : ''}${labels[target]}"><i>${icon(marks[target])}</i><span>${labels[target]}</span></button>`).join('')}</div>
    <button type="button" data-home class="atelier-home" aria-label="Return to the entrance" title="Return to the entrance (Home)">⌂</button>
    <div class="atelier-paper" hidden><div class="atelier-tray" role="dialog" aria-modal="true" aria-label="${labels.counter}"><button type="button" data-stow class="stow-register" aria-label="Close ledger">×</button><div data-register></div></div></div>
    <div class="atelier-conversation" hidden></div>`
  host.replaceChildren(section)
  const paper = section.querySelector<HTMLElement>('.atelier-paper')!,
    talk = section.querySelector<HTMLElement>('.atelier-conversation')!
  const tray = section.querySelector<HTMLElement>('.atelier-tray')!,
    ledger = section.querySelector<HTMLElement>('[data-register]')!
  let world: ReturnType<typeof openRoomWorld> | undefined,
    dead = false,
    illustrated = false,
    returnTo: HTMLElement | null = null
  // Closed panels are inert to accessibility navigation and to the walk controller.
  tray.removeAttribute('aria-modal')
  function hide() {
    paper.hidden = true
    talk.hidden = true
    tray.removeAttribute('aria-modal')
    ledger.replaceChildren()
    talk.replaceChildren()
    section.classList.remove('reading')
    const focus = returnTo
    returnTo = null
    focus?.focus({ preventScroll: true })
  }
  function writeLedger() {
    const old = ledger.querySelector<HTMLElement>('.sk-room-ledger')?.scrollTop ?? 0
    renderInterior(ledger, station, current(), act, navigate, recordContact, true)
    const scroll = ledger.querySelector<HTMLElement>('.sk-room-ledger')
    if (scroll) scroll.scrollTop = old
  }
  function activate(target: RoomTarget) {
    if (target === 'door') {
      navigate('harbor')
      return
    }
    returnTo = section.querySelector<HTMLElement>('[data-place="' + target + '"]')
    section.classList.add('reading')
    if (target === 'worker' || target === 'guest') {
      talk.hidden = false
      mountStationTalk(talk, current(), target === 'guest' ? guest : npc, hide, recordContact)
    } else {
      if (station === 'authority') recordContact({ type: 'visitNpc', npc })
      paper.hidden = false
      tray.setAttribute('aria-modal', 'true')
      writeLedger()
      section.querySelector<HTMLElement>('[data-stow]')!.focus({ preventScroll: true })
    }
  }
  const abort = new AbortController(),
    opts = { signal: abort.signal }
  section.addEventListener(
    'click',
    (event) => {
      const el = event.target instanceof Element ? event.target : null
      if (el === paper || el?.closest('[data-stow]')) {
        hide()
        return
      }
      if (el?.closest('[data-quay]')) {
        navigate('harbor')
        return
      }
      const pin = el?.closest<HTMLButtonElement>('[data-place]')
      if (pin && !section.classList.contains('reading')) activate(pin.dataset.place as RoomTarget)
    },
    opts,
  )
  section.addEventListener(
    'focusin',
    (event) => {
      const pin =
        event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('button[data-place]') : null
      if (pin?.classList.contains('pin-outside') && pin.matches(':focus-visible'))
        world?.framePlace(pin.dataset.place as RoomTarget)
    },
    opts,
  )
  document.addEventListener(
    'keydown',
    (event) => {
      if (paper.hidden && talk.hidden) return
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        hide()
        return
      }
      if (event.key !== 'Tab') return
      const panel = paper.hidden ? talk : tray,
        all = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea,summary,a[href]',
          ),
        ).filter((el) => el.getClientRects().length)
      if (!all.length) return
      if (event.shiftKey && all[0] === document.activeElement) {
        event.preventDefault()
        all.at(-1)!.focus()
      } else if (!event.shiftKey && all.at(-1) === document.activeElement) {
        event.preventDefault()
        all[0].focus()
      }
    },
    opts,
  )
  let lightingWatch = current().mission === 'lit'
  function loadWorld() {
    void import('./voxel/workroom-world')
      .then(({ openRoomWorld }) => {
        if (!dead) world = openRoomWorld(section, current(), station, activate)
      })
      .catch(() => {
        if (dead) return
        illustrated = true
        section.classList.add('atelier-illustrated')
        section.querySelector('.atelier-caption')?.remove()
        // The same counters and people remain available without a graphics context.
        const simple = section.querySelector<HTMLElement>('.atelier-places')!
        simple.setAttribute('aria-label', title)
        activate('counter')
      })
  }
  loadWorld()
  return {
    key: port + '/' + station,
    refresh() {
      const watch = current().mission === 'lit'
      if (world && watch !== lightingWatch) {
        world.dispose()
        world = undefined
        const oldCanvas = section.querySelector('canvas')!
        oldCanvas.replaceWith(oldCanvas.cloneNode(false))
        lightingWatch = watch
        loadWorld()
      }
      if (!paper.hidden) writeLedger()
    },
    dispose() {
      dead = true
      abort.abort()
      world?.dispose()
      if (illustrated) ledger.replaceChildren()
    },
  }
}
