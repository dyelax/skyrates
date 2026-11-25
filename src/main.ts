import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-600-italic.css'
import './style.css'
import { act, boardingStrength, loadGame, PORTS, saveGame, type BattleResult, type Command } from './model'
import { renderInterior, type InteriorView } from './interiors'
import { mountHarbor } from './harbor'
import { beginAmbience, bell } from './audio'

type View = InteriorView | 'harbor' | 'battle'
const root = document.querySelector<HTMLElement>('#app')!
root.innerHTML = `<a class="skip" href="#main">Skip to game</a><main id="main" tabindex="-1"></main><div id="toast" role="status" aria-live="polite"></div>`
const main = root.querySelector<HTMLElement>('#main')!
const toast = root.querySelector<HTMLElement>('#toast')!
let harborUnmount: (() => void) | undefined

let state = loadGame()
let stored = saveGame(state)
let view: View = state.voyage ? (state.voyage.phase === 'battle' ? 'battle' : 'voyage') : 'harbor'
let battleUnmount: (() => void) | undefined
let renderToken = 0
let toastTimer: number | undefined

function notify(message: string) {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.toggle('visible', !!message)
  if (message) toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 5500)
}

function navigate(next: View) {
  if (state.voyage && next !== 'battle' && next !== 'voyage') return
  bell('select')
  view = next
  notify('')
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
  if (state.voyage) view = state.voyage.phase === 'battle' ? 'battle' : 'voyage'
  else if (arrival) view = 'harbor'
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
  notify(state.notice)
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
          authority: 'Port Authority',
          voyage: 'On passage',
        }[view]) + ' · Skyrates'
  if (view === 'harbor') harborUnmount = mountHarbor(main, state, navigate)
  else if (view === 'battle' && state.voyage) {
    const leg = state.voyage
    main.innerHTML = '<section class="battle-loading" role="status">Taking the helm…</section>'
    void import('./battle')
      .then(({ mountBattle }) => {
        if (token !== renderToken || state.voyage?.id !== leg.id) return
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
          hullLevel: (state.ship.maxHull - 100) / 25,
          quickGunnery: state.ability === 'gunner',
          startingHull: state.ship.hull,
          shipName: 'The Wayfarer',
          onFinish: (outcome, hull) =>
            dispatch({ type: 'resolveBattle', id: leg.id, result: results[outcome], hull }),
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
            dispatch({ type: 'resolveBattle', id: leg.id, result: 'escaped', hull: state.ship.hull }),
          )
      })
  } else renderInterior(main, view as InteriorView, state, dispatch, navigate)
}

document.addEventListener('pointerdown', beginAmbience, { once: true })
render()
