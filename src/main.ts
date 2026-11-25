import { openVoiceSettings } from './npc-voices'
import { receiveCaptain } from './edition-transfer'
import { firstWatchNote } from './handbook'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-600-italic.css'
import './style.css'
import {
  act,
  advanceDrill,
  boardingStrength,
  loadGame,
  PORTS,
  saveGame,
  type BattleResult,
  type Command,
} from './model'
import { renderInterior, type InteriorView } from './interiors'
import { mountHarbor } from './harbor'
import { openPrologue } from './prologue'
import { beginAmbience, bell } from './audio'

type View = InteriorView | 'harbor' | 'battle'
const root = document.querySelector<HTMLElement>('#app')!
root.innerHTML = `<a class="skip" href="#main">Skip to game</a><main id="main" tabindex="-1"></main><aside id="toast" hidden><span role="status" aria-live="polite" aria-atomic="true"></span><button type="button">Acknowledge</button></aside>`
const main = root.querySelector<HTMLElement>('#main')!
const toast = root.querySelector<HTMLElement>('#toast')!
let harborUnmount: (() => void) | undefined

let state = loadGame()
let stored = saveGame(state)
let view: View = state.drill
  ? 'battle'
  : state.voyage
    ? state.voyage.phase === 'battle'
      ? 'battle'
      : 'voyage'
    : 'harbor'
let battleUnmount: (() => void) | undefined
let renderToken = 0
function drawNotice() {
  const [message] = state.pendingNotices
  toast.hidden = !message
  toast.classList.toggle('visible', !!message)
  toast.querySelector('span')!.textContent = message || ''
  const remaining = state.pendingNotices.length - 1
  toast.querySelector('button')!.textContent =
    remaining > 0 ? 'Acknowledge · ' + remaining + ' more' : 'Acknowledge'
}

toast.querySelector('button')!.addEventListener('click', () => {
  state = { ...state, pendingNotices: state.pendingNotices.slice(1) }
  stored = saveGame(state)
  drawNotice()
  if (toast.hidden) main.focus({ preventScroll: true })
})

function navigate(next: View) {
  if (state.voyage && next !== 'battle' && next !== 'voyage') return
  bell('select')
  view = next
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
  main.focus({ preventScroll: true })
}

function dispatch(command: Command) {
  const prev = state
  const next = act(state, command)
  if (next === prev) return
  state = next
  stored = saveGame(state)
  const arrival = !!prev.voyage && !state.voyage
  if (state.drill) view = 'battle'
  else if (state.voyage) view = state.voyage.phase === 'battle' ? 'battle' : 'voyage'
  else if (arrival) view = 'harbor'
  else if (command.type === 'endDrill') view = 'shipyard'
  bell(
    command.type === 'payInvoice'
      ? 'mission'
      : arrival
        ? 'dock'
        : ['buy', 'sell', 'upgrade'].includes(command.type)
          ? 'trade'
          : 'select',
  )
  render()
  if (arrival || command.type === 'sail' || command.type === 'engage' || command.type === 'payInvoice')
    window.scrollTo({ top: 0, behavior: 'instant' })
  drawNotice()
}

function render() {
  const token = ++renderToken
  battleUnmount?.()
  battleUnmount = undefined
  harborUnmount?.()
  harborUnmount = undefined
  main.dataset.saved = String(stored)
  main.dataset.screen = view
  document.title =
    (view === 'harbor'
      ? PORTS[state.port].name
      : {
          market: 'Port Market',
          chart: 'Sky chart',
          log: 'Captain’s log',
          battle: 'Battle stations',
          shipyard: 'Shipyard',
          civic: 'Local institution',
          authority: 'Port Authority',
          voyage: 'On passage',
        }[view]) + ' · Skyrates'
  if (view === 'harbor') {
    harborUnmount = mountHarbor(main, state, navigate)
    if (state.firstWatch === 'arrived' && state.port === 'sunstep' && state.mission === 'offered')
      firstWatchNote(main,state,()=>navigate('authority'),()=>{
        state = {...state,firstWatch:'briefed'}
        stored=saveGame(state)
      })
  }
  else if (view === 'battle' && (state.voyage || state.drill)) {
    const leg = state.voyage
    main.innerHTML = '<section class="battle-loading" role="status">Taking the helm…</section>'
    void import('./battle')
      .then(({ mountBattle }) => {
        if (token !== renderToken || state.voyage?.id !== leg?.id) return
        main.replaceChildren()
        const results: Record<string, BattleResult> = {
          victory: 'won',
          boarded: 'boarded',
          defeat: 'lost',
          escaped: 'escaped',
        }
        battleUnmount = mountBattle(main, {
          crew: state.ship.crew,
          skill: boardingStrength(state) / state.ship.crew,
          gunLevel: state.ship.guns,
          cannons: state.ship.cannons,
          drill: state.drill
            ? {
                stage: state.drill,
                onCheckpoint: (stage) => {
                  const next = advanceDrill(state, stage)
                  if (next === state) return
                  state = next
                  stored = saveGame(state)
                },
                onLeave: (skip) => dispatch({ type: 'endDrill', skip }),
              }
            : undefined,
          hullLevel: (state.ship.maxHull - 100) / 25,
          quickGunnery: state.ability === 'gunner',
          startingHull: state.ship.hull,
          shipName: 'The Wayfarer',
          onFinish: (outcome, hull) =>
            leg && dispatch({ type: 'resolveBattle', id: leg.id, result: results[outcome], hull }),
        })
      })
      .catch(() => {
        if (token !== renderToken) return
        main.innerHTML =
          '<section class="battle-loading"><p>The encounter could not load.</p><button class="gold-action" data-retry>Retry encounter</button><button class="mission-action" data-withdraw>Withdraw to port</button></section>'
        main.querySelector('[data-retry]')?.addEventListener('click', render)
        main
          .querySelector('[data-withdraw]')
          ?.addEventListener('click', () =>
            state.drill
              ? dispatch({ type: 'endDrill', skip: true })
              : leg && dispatch({ type: 'resolveBattle', id: leg.id, result: 'escaped', hull: state.ship.hull }),
          )
      })
  } else renderInterior(main, view as InteriorView, state, dispatch, navigate)
}

document.addEventListener('pointerdown', beginAmbience, { once: true })
render()

drawNotice()

if (state.firstWatch === 'new' && !state.voyage && state.day === 1) {
  openPrologue(() => {
    state = { ...state, firstWatch: 'arrived' }
    stored = saveGame(state)
    render()
    main.focus({ preventScroll: true })
  })
}

if (new URLSearchParams(location.search).has('voices')) openVoiceSettings()
receiveCaptain()
