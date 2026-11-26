import { salvageLabel, type SalvageReceipt } from './salvage'
import { prizeManifest } from './prize-command'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import { artwork } from './artwork'
import { PORTS, PORT_IDS, type PortId } from './data'
import { armamentLabel, buildShip, STILL_AIR } from './battle-model'
import { RAIDER_PROFILES } from './raiders'
import { setSessionSound } from './audio'
import type { BattleEnding } from './battle-state'
import type { TrialProtectionReport } from './trial-protection'
import { ESCORT_LEGS } from './merchant-escort'
import { routeWeather, type WeatherReport } from './weather'
import './battle-test.css'

const fittings = [
  { name: 'Starter Wayfarer', hullLevel: 0, gunLevel: 0, hands: 6, veterans: 1 },
  { name: 'Veteran boarding fit', hullLevel: 1, gunLevel: 1, hands: 8, veterans: 3 },
  { name: 'Broadside gunship', hullLevel: 2, gunLevel: 5, hands: 6, veterans: 1 },
]

// Keep the windy preset's repeatable chart wind, with clear visibility so both
// nonstorm presets can be compared against the same passing squall.
const calm: WeatherReport = {
  kind: 'clear', season: 'spring', wind: STILL_AIR, severity: 0,
  summary: 'Clear skies', bearing: 'calm', knots: 0,
}
const { wind, knots, bearing } = routeWeather('meridian', 'copperfall', 1)
const forecasts = [
  { name: 'Calm', report: calm },
  { name: 'Windy', report: { ...calm, wind, knots, bearing } },
  { name: 'Storm', report: routeWeather('copperfall', 'meridian', 30) },
]

const outcomeText: Record<BattleEnding, string> = {
  victory: 'Enemy ship wrecked', defeat: 'Your ship wrecked', mutualWreck: 'Both ships wrecked',
  boarded: 'Enemy crew surrendered', yielded: 'Your crew surrendered',
  withdrawn: 'Both crews withdrew', escaped: 'You broke away',
}

const scenarios = [
  { id: 'duel', name: 'Duel', order: '' },
  { id: 'prize-protection', name: 'Prize protection', order: 'Board a raider to take its surrender. Guard the white flag while the other raider is still fighting.' },
  { id: 'merchant-escort', name: 'Merchant escort', order: 'Guard an unarmed merchant through two legs. Defeat each raider or let the merchant reach the exit. Its hull damage carries over.' },
] as const

interface TrialEnd {
  outcome: BattleEnding
  hull: number
  enemyHull: number
  salvage?: SalvageReceipt
  crew: Readonly<{ player: number; enemy: number }>
  protection?: TrialProtectionReport
}

function resultHeading(result: TrialEnd): string {
  const { outcome, protection } = result
  if (!protection || result.hull <= 0 || ['yielded', 'withdrawn', 'escaped'].includes(outcome)) return outcomeText[outcome]
  const merchant = protection.scenario === 'merchant-escort'
  if (protection.status === 'lost') return merchant ? 'Merchant lost' : 'Prize lost'
  if (protection.status === 'afloat') return merchant ? 'Merchant delivered' : 'Prize secured'
  return outcomeText[outcome]
}

function protectedShipCard(report: TrialProtectionReport) {
  const merchant = report.scenario === 'merchant-escort'
  const fate = report.hull <= 0 ? 'Wrecked' : report.status === 'escaped' ? 'Left behind' : 'Afloat'
  return `<article class="ship-card protected"><p class="card-label">${merchant ? 'Escorted ship' : 'Surrendered ship'}</p>
    <h2>${merchant ? 'Merchant' : 'Struck prize'}</h2>
    <div class="ship-plate"><img src="${artwork(merchant ? 'watch-top' : 'raider-top')}" alt=""></div>
    <dl><div><dt>Hull</dt><dd>${Math.ceil(report.hull)} / ${report.maxHull}</dd></div>
    <div><dt>Condition</dt><dd>${fate}</dd></div>
    ${merchant ? '<div class="battery"><dt>Legs cleared</dt><dd>'+report.legs+' / '+ESCORT_LEGS+'</dd></div>' : ''}
    </dl></article>`
}

const desk = document.querySelector<HTMLElement>('#battle-desk')!
desk.style.setProperty('--test-sky', `url("${artwork('cloud-sea')}")`)
let fitIndex = fittings.findIndex(fit => fit.name === 'Broadside gunship')
let enemyIndex = 0
let scenarioIndex = 0
let weatherIndex = 0
let trialLocation: PortId = 'sunstep'
let sound = false
let match = 0
let leaveBattle: (() => void) | undefined

// Reset the opponent's aim and firing intervals on every start. Visual effects use independent randomness.
function trialRandom() {
  let seed = 4817
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
}

function showDesk(result?: TrialEnd, error = '') {
  match++
  leaveBattle?.()
  leaveBattle = undefined
  const fit = fittings[fitIndex]
  const enemy = RAIDER_PROFILES[enemyIndex]
  const scenario = scenarios[scenarioIndex]
  const ship = buildShip({ x: 0, y: 0 }, 0, fit.gunLevel, fit.hullLevel)
  const weather = forecasts[weatherIndex].report
  const strength = fit.hands + 1.5 * fit.veterans
  const options = (names: string[], selected: number) => names.map((name, i) =>
    `<option value="${i}"${i === selected ? ' selected' : ''}>${name}</option>`).join('')
  const read = (left: number | undefined, max: number) =>
    left === undefined ? String(max) : `${left > 0 && left < 0.1 ? '&lt;0.1' : Number(Math.max(0, left).toFixed(1))} / ${max}`
  const shipCard = (player: boolean) => {
    const title = player ? 'Your ship' : scenario.id === 'duel' ? 'Opponent' : 'First raider'
    const name = player ? fit.name : enemy.name
    const names = player ? fittings.map(f => f.name) : RAIDER_PROFILES.map(e => e.name)
    const hull = read(player ? result?.hull : result?.enemyHull, player ? ship.maxHull : enemy.hull)
    const crew = read(player ? result?.crew.player : result?.crew.enemy, player ? strength : enemy.crew)
    return `<article class="ship-card ${player ? 'friendly' : 'hostile'}">
      ${result ? `<p class="card-label">${title}</p>` : `<label for="${player ? 'your-fit' : 'opponent-fit'}">${title}</label>`}
      ${result ? `<h2>${name}</h2>` : `<select id="${player ? 'your-fit' : 'opponent-fit'}" aria-label="${title}">${options(names, player ? fitIndex : enemyIndex)}</select>`}
      <div class="ship-plate"><img src="${artwork(player ? 'schooner-top' : 'raider-top')}" alt=""></div>
      <dl><div><dt>Hull</dt><dd>${hull}</dd></div><div><dt>${result ? 'Crew health' : 'Starting crew strength'}</dt><dd>${crew}</dd></div><div class="battery"><dt>Battery</dt><dd>${armamentLabel(player ? ship.guns.length : enemy.cannons)}</dd></div></dl>
      ${player && !result && ship.guns.length > 2 ? '<p class="battery-tip">Fire a rail as each gun loads, or wait for a full broadside.</p>' : ''}
    </article>`
  }
  desk.innerHTML = `<section class="test-desk">
    <header><span class="brand"><img src="compass.svg" alt="">Skyrates</span><a href="./">Return to campaign</a></header>
    <div class="desk-sheet"><div class="desk-title"><p>${result ? scenario.name + ' result' : 'Harbor Watch'}</p><h1>${result ? resultHeading(result) : 'Battle test'}</h1>
    ${result ? '' : '<p class="intro">Choose two ships and take the helm. Practice battles leave your campaign save untouched.</p>'}</div>
    <div class="matchup">${shipCard(true)}${result?.protection ? protectedShipCard(result.protection) : !result || scenario.id === 'duel' ? shipCard(false) : ''}</div>
    <footer><div class="conditions">${result ? '' : `<div class="condition-fields">
      <label>Scenario<select id="trial-scenario">${options(scenarios.map(s => s.name),scenarioIndex)}</select></label>
      <label>Location<select id="trial-location">${PORT_IDS.map(id => `<option value="${id}"${id === trialLocation ? ' selected' : ''}>${PORTS[id].name}</option>`).join('')}</select></label>
      <label>Weather<select id="trial-weather">${options(forecasts.map(f => f.name),weatherIndex)}</select></label>
    </div>${scenario.order ? '<p class="trial-order">'+scenario.order+'</p>' : ''}`}
      ${result?.salvage ? '<span class="trial-salvage">'+salvageLabel(result.salvage)+'</span>' : ''}
      <span>${result ? PORTS[trialLocation].name + ' · ' : ''}${weather.summary} · ${weather.knots} kn ${weather.bearing} · ${weather.season}</span></div>
    <div class="actions">${result ? '<button id="change">Change setup</button>' : `<label class="sound"><input type="checkbox" id="sounds"${sound ? ' checked' : ''}> Battle sound</label>`}
    <button id="fight" class="fight">${result ? 'Rematch' : 'Fight'}</button></div></footer>
    ${error ? '<p role="alert">The battle chart could not load. Try Fight again.</p>' : ''}
    </div></section>`
  function change(event: Event) {
    const select = event.currentTarget as HTMLSelectElement
    if (select.id === 'your-fit') fitIndex = select.selectedIndex
    else if (select.id === 'opponent-fit') enemyIndex = select.selectedIndex
    else if (select.id === 'trial-scenario') scenarioIndex = select.selectedIndex
    else if (select.id === 'trial-location') trialLocation = PORT_IDS[select.selectedIndex]
    else if (select.id === 'trial-weather') weatherIndex = select.selectedIndex
    showDesk()
    desk.querySelector<HTMLElement>('#' + select.id)?.focus()
  }
  desk.querySelectorAll('select').forEach(select => select.addEventListener('change', change))
  desk.querySelector('#sounds')?.addEventListener('change', event => {
    sound = (event.currentTarget as HTMLInputElement).checked
  })
  desk.querySelector('#change')?.addEventListener('click', () => {
    showDesk()
    desk.querySelector<HTMLSelectElement>('select')?.focus()
  })
  desk.querySelector('#fight')!.addEventListener('click', async () => {
    const id = ++match
    setSessionSound(sound)
    desk.innerHTML = '<div class="chart-loading" role="status">Opening the battle chart…</div>'
    try {
      const { mountBattle } = await import('./battle')
      if (id !== match) return
      let protection: TrialProtectionReport | undefined
      leaveBattle = mountBattle(desk, {
        opponent: enemy, crew: fit.hands, skill: strength / fit.hands, gunLevel: fit.gunLevel,
        cannons: ship.guns.length, hullLevel: fit.hullLevel, shipName: fit.name,
        salvageLoad: { manifest: prizeManifest({ pirateSeed: 4817 }, enemy.id, PORT_IDS.indexOf(trialLocation) + 1), free: 12 },
        location: trialLocation, weather, combatRandom: trialRandom(),
        trialScenario: scenario.id === 'duel' ? undefined : scenario.id,
        onTrialReport: report => { protection = report },
        onExit: () => { if (id === match) { showDesk(); desk.querySelector<HTMLButtonElement>('#fight')?.focus() } },
        onUnavailable: () => { if (id === match) showDesk(undefined, 'unavailable') },
        onFinish: (outcome, hull, enemyHull, crew, salvage) => {
          if (id !== match) return
          showDesk({ outcome, hull, enemyHull, crew, salvage, protection })
          desk.querySelector<HTMLButtonElement>('#fight')?.focus()
        },
      })
    } catch {
      if (id === match) showDesk(undefined, 'unavailable')
    }
  })
}

showDesk()
