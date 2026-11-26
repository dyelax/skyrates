import { mountWorldFlight } from './world-flight-view'
import { nearbyWorldSite, nearbyDock, type WorldSiteId } from './world-flight'
import { mountDockTalk } from './dock-talk'
import './campaign-world.css'
import { openVoiceSettings } from './npc-voices'
import { receiveCaptain } from './edition-transfer'
import { firstWatchNote } from './handbook'
import { WATCH_CUTTER } from './battle-model'
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
  hasCaptainPerk,
  loadGame,
  PORTS,
  saveGame,
  CAMPAIGN_RESULTS,
  checkpointFlight,
  checkpointBerth,
  worldAtBerth,
  encounterId,
  type Command,
} from './model'
import { renderInterior, type InteriorView } from './interiors'
import { type ContactWriter } from './characters'
import { mountPlaytestChat } from './playtest-chat'
import { openPrologue } from './prologue'
import { battleLocation, voyageWeather } from './weather'
import { beginAmbience, bell, loadSoundPreference } from './audio'

loadSoundPreference()

type View = InteriorView | 'harbor' | 'battle' | 'local'
const root = document.querySelector<HTMLElement>('#app')!
root.innerHTML = `<a class="skip" href="#main">Skip to game</a><main id="main" tabindex="-1"></main><aside id="toast" data-marker-obstacle hidden><span role="status" aria-live="polite" aria-atomic="true"></span><button type="button">Acknowledge</button></aside>`
const main = root.querySelector<HTMLElement>('#main')!
main.innerHTML = '<div class="campaign-sky"></div><div class="campaign-surface" hidden></div>'
const sky = main.querySelector<HTMLElement>('.campaign-sky')!
const surface = main.querySelector<HTMLElement>('.campaign-surface')!
const toast = root.querySelector<HTMLElement>('#toast')!
// Reserve the notice's actual wrapped height for the controls below the scene.
function measureNotice() {
  const height = toast.hidden ? 0 : toast.offsetHeight + 12
  root.style.setProperty('--notice-space', height + 'px')
}
new ResizeObserver(measureNotice).observe(toast)

let world: ReturnType<typeof mountWorldFlight> | undefined

let state = loadGame()
let stored = saveGame(state)
let view: View = state.drill ? 'battle' : state.voyage ? 'voyage' : 'harbor'
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
  measureNotice()
}

toast.querySelector('button')!.addEventListener('click', () => {
  state = { ...state, pendingNotices: state.pendingNotices.slice(1) }
  stored = saveGame(state)
  drawNotice()
  if (toast.hidden) main.focus({ preventScroll: true })
})

const recordContact: ContactWriter = command => {
  const next = act(state, command)
  if (next !== state) {
    state = next
    stored = saveGame(state)
    main.dataset.saved = String(stored)
  }
  return state
}

function navigate(next: View) {
  if (next === 'local' || next === 'market' || next === 'authority' || next === 'shipyard' || next === 'civic') {
    const site: WorldSiteId = next === 'local' ? 'dockworker' : next
    if (!state.voyage && nearbyWorldSite(worldAtBerth(state))?.siteId !== site) {
      view = 'harbor'
      render()
      world?.approachSite(site)
      return
    }
  }
  if (state.voyage && next === 'harbor') next = 'voyage'
  if (state.voyage && !['battle','voyage','chart','log'].includes(next)) return
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
  else if (state.voyage) view = 'voyage'
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
  if (arrival || command.type === 'castOff' || command.type === 'sail' || command.type === 'engage' || command.type === 'payInvoice')
    window.scrollTo({ top: 0, behavior: 'instant' })
  drawNotice()
}

function render() {
  const leg=state.voyage
  const battle=leg?.battle
  if (leg?.phase==='battle' && battle?.terminal && !battle.salvage?.remaining && !state.drill) {
    dispatch({type:'resolveBattle',id:encounterId(leg),result:CAMPAIGN_RESULTS[battle.terminal],hull:battle.player.hull,enemyHull:battle.enemy.hull})
    return
  }
  const token = ++renderToken
  battleUnmount?.()
  battleUnmount = undefined
  main.querySelector('.first-watch-note')?.remove()
  const cruising = view === 'voyage' && !!state.voyage && ['underway','raider','merchant','battle'].includes(state.voyage.phase)
  const sheet = view !== 'harbor' && !cruising
  surface.replaceChildren()
  surface.hidden = !sheet
  surface.classList.toggle('battle-surface', view === 'battle')
  surface.classList.toggle('map-surface', view === 'chart')
  sky.inert = sheet
  sky.hidden = view === 'battle'
  if (world) world.update(state)
  else world = mountWorldFlight(sky,{
    state,
    onCheckpoint:(flight,battle) => {
      const leg = state.voyage
      if (!leg || state.drill) return
      const next = checkpointFlight(state,leg.id,flight,battle)
      if (next === state) return
      state = next
      stored = saveGame(state)
      if (next.voyage?.phase !== leg.phase) render()
      else if (battle?.terminal && !battle.salvage?.remaining) {
        dispatch({type:'resolveBattle',id:encounterId(leg),result:CAMPAIGN_RESULTS[battle.terminal],
          hull:battle.player.hull,enemyHull:battle.enemy.hull})
      }
    },
    onAttack:contact => {
      if (!sky.inert && state.voyage) dispatch({type:'attackMerchant',id:state.voyage.id,contact})
    },
    onDemandChoice:choice => {
      const leg=state.voyage
      if (!leg || sky.inert) return
      if (choice==='refuse') dispatch({type:'engage'})
      else if (choice==='leave') dispatch({type:'leaveMerchant',id:encounterId(leg)})
      else if (choice==='attack' && leg.hailed) dispatch({type:'attackMerchant',id:leg.id,contact:leg.hailed})
      else if (choice==='cargo'||choice==='crowns') dispatch({type:'payToll',id:encounterId(leg),payment:choice})
    },
    onBerthCheckpoint:flight => {
      if (sky.inert) return
      const next = checkpointBerth(state,flight)
      if (next !== state) { state = next; stored = saveGame(state) }
    },
    onCastOff:() => { if (!sky.inert) dispatch({type:'castOff'}) },
    onWaypoint:port => { if (!sky.inert && state.voyage) dispatch({type:'setWaypoint',id:state.voyage.id,port}) },
    onHail:contact => { if (!sky.inert && state.voyage) dispatch({type:'hailFlight',id:state.voyage.id,contact,manual:true}) },
    onDock:port => { if (!sky.inert && state.voyage) dispatch({type:'dockFlight',id:state.voyage.id,port}) },
    onService:place => {
      if (sky.inert) return
      if (place === 'chart' || place === 'log') { navigate(place); return }
      const flight = state.voyage?.flight ?? worldAtBerth(state)
      const site = nearbyWorldSite(flight)
      if (!site || site.siteId !== (place === 'local' ? 'dockworker' : place)) return
      if (state.voyage) {
        if (nearbyDock(flight) !== site.port) return
        dispatch({type:'dockFlight',id:state.voyage.id,port:site.port})
      }
      if (!state.voyage && state.port === site.port) navigate(place)
    },
  })
  main.dataset.saved = String(stored)
  main.dataset.screen = view
  document.title =
    (view === 'harbor'
      ? PORTS[state.port].name
      : {
          local: 'On the quay',
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
    if (state.firstWatch === 'arrived' && state.port === 'sunstep' && state.mission === 'offered')
      firstWatchNote(main,state,()=>navigate('authority'),()=>{
        state = {...state,firstWatch:'briefed'}
        stored=saveGame(state)
      })
  }
  else if (cruising) return
  else if (view === 'local') mountDockTalk(surface,state,() => navigate('harbor'),recordContact)
  else if (view === 'battle' && state.drill) {
    // The Watch exercise is an authored range. Campaign armament runs directly
    // on the world renderer and retains its camera, weather and traffic.
    surface.innerHTML='<section class="battle-loading" role="status">Taking the helm…</section>'
    const unavailable=() => {
      if (token!==renderToken) return
      surface.innerHTML='<section class="battle-loading"><p>The Watch exercise could not load.</p><button data-retry>Retry exercise</button><button data-skip>Skip free exercise</button></section>'
      surface.querySelector('[data-retry]')!.addEventListener('click',render)
      surface.querySelector('[data-skip]')!.addEventListener('click',()=>dispatch({type:'endDrill',skip:true}))
    }
    void import('./battle').then(({mountBattle})=>{
      if (token!==renderToken || !state.drill) return
      battleUnmount=mountBattle(surface,{
        opponent:WATCH_CUTTER,crew:state.ship.crew,skill:boardingStrength(state)/state.ship.crew,
        gunLevel:state.ship.guns,cannons:state.ship.cannons,location:battleLocation(state),weather:voyageWeather(state),
        startingHull:state.ship.hull,hullLevel:(state.ship.maxHull-100)/25,
        quickGunnery:hasCaptainPerk(state,'gunner'),shipName:'The Wayfarer',onUnavailable:unavailable,
        drill:{stage:state.drill,onCheckpoint:stage=>{
          if (token!==renderToken) return
          state=advanceDrill(state,stage)
          stored=saveGame(state)
        },onLeave:skip=>dispatch({type:'endDrill',skip})},
        onFinish:()=>{},
      })
    }).catch(unavailable)
  } else renderInterior(surface,view as InteriorView,state,dispatch,navigate,recordContact,false,true)
}

mountPlaytestChat(() => ({state,view}))
document.addEventListener('pointerdown', beginAmbience, { once: true })
render()

drawNotice()

if (state.firstWatch === 'new' && !state.voyage && state.day === 1) {
  sky.inert = true
  openPrologue(() => {
    state = { ...state, firstWatch: 'arrived' }
    stored = saveGame(state)
    render()
    main.focus({ preventScroll: true })
  })
}

if (new URLSearchParams(location.search).has('voices')) openVoiceSettings()
receiveCaptain()
