import { artwork } from './artwork'
import { CITY_ECONOMY } from './city-economy'
import { npcAtPort, npcName, type ContactWriter } from './characters'
import { mountStationTalk } from './dock-talk'
import { icon } from './icons'
import { renderInterior, type InteriorView } from './interiors'
import { PORTS, type Command, type GameState } from './model'
import { ROOM_SCENES, roomTargets, type RoomPoint } from './workshop-scenes'
import { mountRoomPan } from './workshop-camera'
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
  const port = current().port
  const city = CITY_ECONOMY[port]
  const room = ROOM_SCENES[port][station]
  const npc = npcAtPort(port, station)
  const guest = npcAtPort(port, 'civic')
  const title = {
    market: city.market,
    shipyard: city.yard,
    authority: PORTS[port].keeper + '’s office',
    civic: city.institution,
  }[station]
  const labels: Record<RoomTarget, string> = {
    counter: counterNames[station],
    worker: npcName(npc),
    guest: npcName(guest),
    door: 'Harbor door',
  }
  const icons: Record<RoomTarget, string> = {
    counter: 'book-open',
    worker: 'message-circle',
    guest: 'message-circle',
    door: 'chevron-right',
  }
  const hotspots = roomTargets(room).map(target => {
    const [x, y] = room[target]!
    const action = target === 'counter' ? 'Open ' : target === 'door' ? '' : 'Talk to '
    return `<button type="button" data-place="${target}" class="station-pin" style="left:${x}%;top:${y}%" aria-label="${action}${labels[target]}">
      <i>${icon(icons[target])}</i><span class="station-label">${labels[target]}</span></button>`
  }).join('')
  const section = document.createElement('section')
  section.className = 'atelier atelier-ready'
  section.setAttribute('aria-label', title)
  section.style.setProperty('--cabinet', `url("${artwork('cabinet-' + station + '-' + port)}")`)
  section.innerHTML = `<div class="atelier-view"><div class="room-plate">
      <img class="room-picture" alt="" draggable="false" src="${artwork(room.art)}" fetchpriority="high">
      <div class="atelier-places">${hotspots}</div></div></div>
    <div class="atelier-caption"><small>${PORTS[port].name}</small><h1>${title}</h1></div>
    <button type="button" data-quay class="atelier-back" aria-label="Return to harbor">${icon('arrow-right')} Harbor</button>
    <div class="atelier-tools"><button type="button" class="room-hints" aria-label="Show place names" aria-pressed="false" title="Show place names (H)">${icon('scan-eye')}</button>
    <button type="button" class="atelier-home" aria-label="Return to the entrance" title="Return to the entrance (Home)">${icon('compass')}</button></div>
    <div class="atelier-paper" hidden><div class="atelier-tray" role="dialog" aria-label="${labels.counter}">
    <button type="button" data-stow class="stow-register" aria-label="Close ledger">×</button><div data-register></div></div></div>
    <div class="atelier-conversation" hidden></div>`
  host.replaceChildren(section)
  const paper = section.querySelector<HTMLElement>('.atelier-paper')!
  const talk = section.querySelector<HTMLElement>('.atelier-conversation')!
  const tray = section.querySelector<HTMLElement>('.atelier-tray')!
  const ledger = section.querySelector<HTMLElement>('[data-register]')!
  const plate = section.querySelector<HTMLElement>('.room-plate')!
  const picture = section.querySelector<HTMLImageElement>('.room-picture')!
  const hints = section.querySelector<HTMLButtonElement>('.room-hints')!
  const abort = new AbortController()
  const opts = { signal: abort.signal }
  const entrance: RoomPoint = [(room.worker[0] + room.counter[0]) / 2, Math.min(53, room.worker[1] + 2)]
  const viewport = section.querySelector<HTMLElement>('.atelier-view')!
  const pan = mountRoomPan(viewport, plate, picture, entrance, abort.signal)
  let returnTo: HTMLButtonElement | undefined
  const reading = () => !paper.hidden || !talk.hidden

  function hide() {
    paper.hidden = true
    talk.hidden = true
    tray.removeAttribute('aria-modal')
    ledger.replaceChildren()
    talk.replaceChildren()
    section.classList.remove('reading')
    returnTo?.focus({ preventScroll: true })
    returnTo = undefined
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
    returnTo = section.querySelector<HTMLButtonElement>(`[data-place="${target}"]`)!
    section.classList.add('reading')
    if (target === 'worker' || target === 'guest') {
      talk.hidden = false
      mountStationTalk(talk, current(), target === 'guest' ? guest : npc, hide, recordContact)
    } else {
      if (station === 'authority') recordContact({ type: 'visitNpc', npc })
      paper.hidden = false
      tray.setAttribute('aria-modal', 'true')
      writeLedger()
      tray.querySelector<HTMLElement>('[data-stow]')!.focus({ preventScroll: true })
    }
  }
  function toggleHints() {
    const shown = section.classList.toggle('show-room-names')
    hints.setAttribute('aria-pressed', String(shown))
    hints.setAttribute('aria-label', shown ? 'Hide place names' : 'Show place names')
  }
  section.addEventListener('click', event => {
    const el = event.target instanceof Element ? event.target : null
    if (el === paper || el === talk || el?.closest('[data-stow]')) { hide(); return }
    if (el?.closest('[data-quay]')) { navigate('harbor'); return }
    if (reading()) return
    if (el?.closest('.room-hints')) { toggleHints(); return }
    if (el?.closest('.atelier-home')) { pan.pointAt(entrance); return }
    const pin = el?.closest<HTMLButtonElement>('[data-place]')
    if (pin) activate(pin.dataset.place as RoomTarget)
  }, opts)
  section.addEventListener('focusin', event => {
    const pin = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('[data-place]') : null
    if (pin?.matches(':focus-visible')) pan.reveal(room[pin.dataset.place as RoomTarget]!)
  }, opts)
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.defaultPrevented) return
    if (reading()) {
      if (event.key === 'Escape') { event.preventDefault(); hide(); return }
      if (event.key !== 'Tab') return
      const panel = paper.hidden ? talk : tray
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea,summary,a[href]',
      )).filter(el => el.getClientRects().length)
      if (!focusable.length) return
      if (event.shiftKey && focusable[0] === document.activeElement) {
        event.preventDefault()
        focusable.at(-1)!.focus()
      } else if (!event.shiftKey && focusable.at(-1) === document.activeElement) {
        event.preventDefault()
        focusable[0].focus()
      }
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable="true"]')) return
    switch (event.key.toLowerCase()) {
      case 'home': event.preventDefault(); pan.pointAt(entrance); break
      case 'h': if (!event.repeat) toggleHints(); break
      case 'arrowleft': case 'a': case 'q': event.preventDefault(); pan.nudge(-60, 0); break
      case 'arrowright': case 'd': case 'e': event.preventDefault(); pan.nudge(60, 0); break
      case 'arrowup': case 'w': event.preventDefault(); pan.nudge(0, -48); break
      case 'arrowdown': case 's': event.preventDefault(); pan.nudge(0, 48); break
    }
  }, opts)

  return {
    key: port + '/' + station,
    refresh() { if (!paper.hidden) writeLedger() },
    dispose() { abort.abort(); talk.replaceChildren(); ledger.replaceChildren() },
  }
}
