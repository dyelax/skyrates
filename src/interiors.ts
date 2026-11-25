import { artwork } from './artwork'
import { armamentLabel, boardingOdds } from './battle-model'
import { seasonalPosting } from './seasonal-trade'
import { openHandbook } from './handbook'
import { routeWeather, seasonAt, CLIMATES } from './weather'
import { openVoiceSettings } from './npc-voices'
import { openPrologue } from './prologue'
import { voyageWeather } from './weather'
import { paintedWeather } from './scene-weather'
import './interiors.css'
import { startDialogue } from './character-dialogue'
import { characterContext, npcAtPort, npcName, type ContactWriter } from './characters'
import { mountStationTalk } from './dock-talk'
import { CITY_ECONOMY, nextPosting, RARITY } from './city-economy'
import { chartObjectives } from './objectives'
import {
  ABILITIES,
  ABILITY_IDS,
  GOODS,
  GOOD_IDS,
  INVOICE_COST,
  PORTS,
  PORT_IDS,
  boardingStrength,
  raiderToll,
  tollSettlementLabel,
  cargoUsed,
  freightOffer,
  stockAt,
  cityOrder,
  cityService,
  greeting,
  isUnlocked,
  prestigeTitle,
  priceAt,
  routeDays,
  upgradeOffer,
  type Command,
  type GameState,
  type GoodId,
  type PortId,
  type UpgradeId,
} from './model'

export type InteriorView = 'civic' | 'market' | 'shipyard' | 'log' | 'chart' | 'authority' | 'voyage'
type Navigate = (view: InteriorView | 'harbor') => void
type Callback = () => void
type MarketSide = 'buy' | 'sell'

interface InteriorSettings {
  port: PortId
  destination: PortId | null
  focusPort: PortId | null
  firstLight?: boolean
  lastView?: InteriorView
  side: MarketSide
}
// The shell can replace its content element after any command. Keep the selected
// commodity side and chart destination across those redraws within the same game tab.
const settingsByDocument = new WeakMap<Document, InteriorSettings>()
const coins = (value: number) => `${value.toLocaleString('en-US')} cr`
const safe = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )
const bearing: Record<PortId, [number, number]> = {
  sunstep: [16, 70],
  glasshouse: [41, 15],
  copperfall: [79, 75],
  meridian: [85, 31],
}

interface Controls {
  register(callback: Callback): string
  button(label: string, callback: Callback, options?: { disabled?: boolean; secondary?: boolean }): string
  go: Navigate
  act: (command: Command) => void
  refresh: Callback
  settings: InteriorSettings
  page: HTMLElement
}

function metric(label: string, value: string | number) {
  return `<dl class="sk-metric"><dt>${label}</dt><dd>${value}</dd></dl>`
}

function heading(kicker: string, title: string, metrics = '') {
  return `<header class="sk-heading"><div><div class="sk-kicker">${kicker}</div><h1>${title}</h1></div>
    ${metrics ? `<div class="sk-metrics">${metrics}</div>` : ''}</header>`
}

function details(items: [string, string | number][]) {
  return `<dl class="sk-statlist">${items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`
}

function marketOutlook(port:PortId,day:number) {
  return seasonalPosting(port,day).map(post => `<p><b>${GOODS[post.good].name} · ${post.adjustment>0?'+':''}${post.adjustment} cr</b><br>${post.reason}</p>`).join('')
}

function market(state: GameState, ui: Controls) {
  const { side } = ui.settings
  const used = cargoUsed(state)
  const city = CITY_ECONOMY[state.port]
  const goods = GOOD_IDS.filter(good => side === 'buy' ? !!city.stock[good] : state.cargo[good].quantity > 0)
  const rows = goods.map((good) => {
    const item = GOODS[good]
    const price = priceAt(state, state.port, good)[side]
    const lot = state.cargo[good]
    const stock = stockAt(state, state.port, good)
    const limit = side === 'buy' ? Math.min(stock, state.ship.hold - used, Math.floor(state.coins / price)) : lot.quantity
    const fieldId = `sk-order-${good}`
    const input = () => ui.page.querySelector<HTMLInputElement>(`#${fieldId}`)!
    const max = ui.register(() => {
      input().value = String(limit)
      input().dispatchEvent(new Event('input', { bubbles: true }))
    })
    const trade = ui.register(() => {
      const quantity = input().valueAsNumber
      if (Number.isSafeInteger(quantity) && quantity > 0 && quantity <= limit)
        ui.act({ type: side, good, quantity })
    })
    return `<li><div class="sk-good-top"><div class="sk-sample" aria-hidden="true"><img src="${artwork(good)}" alt="" loading="lazy"></div>
      <div><h3>${item.name}</h3><p>${item.description}</p><small>${RARITY[good]} · ${side === 'buy' ? stock ? stock + ' on the floor' : 'Sold out until day ' + nextPosting(state.day) : lot.quantity + ' aboard'}</small></div><span class="sk-price">${coins(price)} <small>/ unit</small></span></div>
      <div class="sk-order" data-side="${side}" data-price="${price}" data-limit="${limit}">
      <label for="${fieldId}">Qty</label><input class="sk-qty" id="${fieldId}" aria-label="${item.name} quantity" type="number" step="1" min="1" max="${Math.max(limit, 1)}" value="${limit ? 1 : 0}" ${limit ? '' : 'disabled'}>
      <button type="button" class="sk-text-button" data-action="${max}" ${limit ? '' : 'disabled'} aria-label="Select maximum ${item.name}">Max</button>
      <button type="button" class="sk-button sk-submit" aria-label="${side === 'buy' ? 'Buy' : 'Sell'} ${item.name}" data-action="${trade}" ${limit ? '' : 'disabled'}>${side === 'buy' ? 'Buy' : 'Sell'} · ${coins(limit ? price : 0)}</button></div></li>`
  }).join('')
  const lots = GOOD_IDS.filter((good) => state.cargo[good].quantity > 0)
  const changeSide = (value: MarketSide) =>
    ui.register(() => {
      ui.settings.side = value
      ui.refresh()
    })
  return (
    heading(
      PORTS[state.port].name,
      city.market,
      metric('Purse', coins(state.coins)) + metric('Hold', `${used} / ${state.ship.hold}`),
    ) +
    `<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Exchange floor</h2><div class="sk-switch" aria-label="Trade direction">
    <button type="button" data-action="${changeSide('buy')}" aria-pressed="${side === 'buy'}">Buy</button>
    <button type="button" data-action="${changeSide('sell')}" aria-pressed="${side === 'sell'}">Sell</button></div></div>
    <details class="sk-fold"><summary>Seasonal market · ${seasonAt(state.day)}</summary>${marketOutlook(state.port,state.day)}</details><ul class="sk-goods">${rows || '<li>Your hold is empty.</li>'}</ul><p>Next exchange posting on day ${nextPosting(state.day)}.</p></article>
    <aside class="sk-stack"><article class="sk-card"><h2>${city.institution}</h2><p>${city.order.need}</p>${ui.button('Visit ' + city.institution, () => ui.go('civic'), { secondary: true })}</article><details class="sk-fold sk-ledger-fold"><summary>Cargo manifest · ${used} / ${state.ship.hold}</summary>
    ${
      lots.length
        ? `<ul class="sk-cargo">${lots
            .map((good) => {
              const lot = state.cargo[good]
              return `<li><span>${GOODS[good].name}<small>Paid ${coins(lot.cost)} · avg. ${(lot.cost / lot.quantity).toFixed(1)} cr</small></span><strong>× ${lot.quantity}</strong></li>`
            })
            .join('')}</ul>`
        : '<p class="sk-empty">Your hold is empty.</p>'
    }
    ${state.freight ? `<p>Consigned freight aboard for ${PORTS[state.freight.to].name}.</p>` : ''}
    </details><details class="sk-fold sk-ledger-fold"><summary>Market intelligence</summary><p>${city.tradeLead}</p>
    <div class="sk-actions">${ui.button('Compare port quotes', () => ui.go('chart'), { secondary: true })}</div></details></aside></div>`
  )
}

function civic(state: GameState, ui: Controls) {
  const city = CITY_ECONOMY[state.port]
  const order = cityOrder(state)
  const service = cityService(state)
  const lot = state.cargo[order.good]
  const source = PORT_IDS.find(id => CITY_ECONOMY[id].specialty === order.good)!
  const plotSource = () => {
    ui.settings.destination = source
    ui.go('chart')
  }
  return heading(PORTS[state.port].name + ' · ' + city.district, city.institution) +
    `<p class="sk-quote">${city.practice}</p>
    <article class="sk-card"><div class="sk-kicker">Local commission · next posting day ${nextPosting(state.day)}</div><h2>${order.name}</h2>
    <p>${order.need}</p>${details([['Requested', order.quantity + ' × ' + GOODS[order.good].name], ['In your hold', lot.quantity], ['On delivery', coins(order.pay)]])}
    <div class="sk-actions">${ui.button(order.filled ? 'Commission filled' : 'Deliver cargo · ' + coins(order.pay), () => ui.act({ type: 'fillCityOrder' }), { disabled: !order.ready })}
    ${!order.filled && !order.ready ? ui.button('Locate ' + PORTS[source].name, plotSource, { secondary: true }) : ''}</div></article>
    ${service ? `<article class="sk-card"><h2>${service.name}</h2><p>${service.description}</p>${ui.button(service.used ? 'Booked through day ' + (nextPosting(state.day) - 1) : service.name, () => ui.act({ type: 'useCityService' }), { disabled: !service.ready })}</article>` : ''}
    <div class="sk-actions">${ui.button(city.market, () => ui.go('market'), { secondary: true })}${ui.button(city.yard, () => ui.go('shipyard'), { secondary: true })}</div>`
}

function shipyard(state: GameState, ui: Controls) {
  const offers = (ids: UpgradeId[]) =>
    `<ul class="sk-offers">${ids.filter(id => CITY_ECONOMY[state.port].upgrades.includes(id))
      .map((id) => {
        const offer = upgradeOffer(state, id)
        return `<li><div><h3>${offer.name}</h3><p>${offer.description}</p></div>
      ${ui.button(coins(offer.cost), () => ui.act({ type: 'upgrade', upgrade: id }), { disabled: !offer.available || state.coins < offer.cost })}</li>`
      })
      .join('')}</ul>`
  return (
    heading(
      PORTS[state.port].name,
      CITY_ECONOMY[state.port].yard,
      metric('Purse', coins(state.coins)) + metric('Hull', `${state.ship.hull} / ${state.ship.maxHull}`),
    ) +
    `<div class="sk-layout"><div class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Refit the schooner</h2></div>${offers(['hold', 'hull', 'guns', 'repair'])}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>Hire crew</h2></div>${offers(['crew', 'veteran'])}</article></div>
    <details class="sk-fold sk-ledger-fold"><summary>Ship’s register</summary>${details([
      ['Hull integrity', `${state.ship.hull} / ${state.ship.maxHull}`],
      ['Hold capacity', `${state.ship.hold} units`],
      ['Cannons fitted', state.ship.cannons],
      ['Gunnery rating', state.ship.guns],
      ['Crew aboard', state.ship.crew],
      ['Veterans', state.ship.veterans],
      ['Boarding strength', boardingStrength(state)],
    ])}<p>Sunstep fits cargo racks. Copperfall forges armor and cannons. Both Copperfall and Meridian sign on veterans.</p><p class="sk-info">Ram another airship and your crew will board. Experienced hands carry more of the fight.</p></details><div class="sk-actions">${ui.button('Practice helm and gunnery', () => ui.act({type:'practiceDrill'}), {secondary:true})}</div></div>`
  )
}

function missionNote(state: GameState) {
  if (state.mission === 'offered') return 'Advance the cost of a new lens and the crew can carry mail through the outer lane again. The Compact grants the first ship a charter, promotion with a captain ability, and repayment plus a 60-crown premium when Pilot Sen certifies the light.'
  if (state.mission === 'accepted') return 'Visit Keeper Iona at Glasshouse Reach to present Vale’s sealed commission.'
  if (state.mission === 'invoice')
    return `Raise ${coins(INVOICE_COST)} and pay Keeper Iona at Glasshouse Reach for the lens.`
  if (state.certificate === 'aboard') return 'Iona’s relighting certificate is in your mail locker. Bring it to Pilot Sen at Meridian Spire to reclaim your 240 crowns and earn the 60-crown premium.'
  return 'The Skyway Beacon is lit. Meridian Spire is open to your schooner.'
}

function logbook(state: GameState, ui: Controls) {
  const ability = state.ability ? ABILITIES[state.ability] : null
  const journal = state.log
  const abilities = ability
    ? `<h3>${ability.name}</h3><p>${ability.description}</p>`
    : state.level >= 2
      ? `<ul class="sk-offers">${ABILITY_IDS.map((id) => `<li><div><h3>${ABILITIES[id].name}</h3><p>${ABILITIES[id].description}</p></div>${ui.button('Learn', () => ui.act({ type: 'chooseAbility', ability: id }))}</li>`).join('')}</ul>`
      : '<p>Relighting the Skyway Beacon earns your first choice of captain ability.</p>'
  return (
    heading(
      'Captain’s records',
      'Captain’s log',
      metric('Rank', `Level ${state.level}`) + metric('Experience', `${state.xp} XP`),
    ) +
    `<div class="sk-layout"><article class="sk-card"><div class="sk-card-head"><h2>Voyage entries</h2></div>
    ${journal.length ? `<ol class="sk-journal">${journal.map((entry) => `<li><span class="sk-date">Day ${entry.day}</span><span>${safe(entry.text)}</span></li>`).join('')}</ol>` : '<p class="sk-empty">Your first voyage awaits.</p>'}</article>
    <aside class="sk-stack"><article class="sk-card"><div class="sk-card-head"><h2>Reputation</h2><span class="sk-tag">${state.notoriety} renown</span></div><h3>${safe(prestigeTitle(state))}</h3>
    <p class="sk-info">${state.tender === 'helped' ? 'The tender skipper remembers your tow. At Copperfall, that friendship opens a freight contract.' : state.tender === 'passed' ? 'You left the stranded tender to hail another ship. Its skipper remembers the sail on the horizon.' : 'Word of your deeds travels with dock crews and freight skippers.'}</p></article>
    <article class="sk-card"><div class="sk-card-head"><h2>Captain ability</h2></div>${abilities}</article>
    <article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2></div><p>${missionNote(state)}</p></article><article class="sk-card"><h2>Your first watch</h2>${ui.button('Open captain’s handbook', () => openHandbook(state))} ${ui.button('Conversation voices', () => openVoiceSettings(), { secondary: true })} ${ui.button('Replay opening cinematic', () => openPrologue(), { secondary: true })}</article></aside></div>`
  )
}

function rememberedPrices(state: GameState, dest: PortId) {
  const visit = state.pricesSeen[dest]
  const local = state.port === dest
  if (!visit && !local) return '<p class="sk-empty">Call at this port to record its market prices.</p>'
  return `<p>${local ? 'Current exchange floor' : `Recorded on day ${visit!.day}`} · buy / sell per unit</p>
    <ul class="sk-prices">${GOOD_IDS.map((good) => {
      const quote = local ? priceAt(state, dest, good) : visit!.prices[good]
      if (!quote) return ''
      const stock = local ? stockAt(state, dest, good) : visit!.stock?.[good]
      const buy = CITY_ECONOMY[dest].stock[good] ? (stock === 0 ? 'sold out' : quote.buy + (stock === undefined ? '' : ' × ' + stock)) : '—'
      return `<li><span>${GOODS[good].name}</span><strong>${buy} / ${coins(quote.sell)}</strong></li>`
    }).join('')}</ul>`
}

function chart(state: GameState, ui: Controls) {
  const dest = ui.settings.destination
  const close = () => {
    ui.settings.focusPort = dest
    ui.settings.destination = null
    ui.refresh()
  }
  const nodes = PORT_IDS.map((id) => {
    const [x, y] = bearing[id]
    const here = id === state.port
    const locked = !isUnlocked(state, id)
    return `<button type="button" class="sk-chart-node ${here ? 'is-home' : ''} ${locked ? 'is-locked' : ''}" style="left:${x}%;top:${y}%" data-port="${id}" aria-label="${PORTS[id].name}${here ? ', current port' : locked ? ', locked' : ''}" aria-haspopup="dialog" aria-pressed="${id === dest}" data-action="${ui.register(
      () => {
        if (id === dest) close()
        else {
          ui.settings.destination = id
          ui.refresh()
        }
      },
    )}"><i class="sk-node-mark" aria-hidden="true"></i><span class="sk-node-label">${PORTS[id].name}</span></button>`
  }).join('')
  let popover = ''
  if (dest) {
    const port = PORTS[dest]
    const current = state.port === dest
    const unlocked = isUnlocked(state, dest)
    const days = routeDays(state.port, dest)
    const forecast = routeWeather(state.port, dest, state.day)
    popover = `<aside class="sk-map-popover" role="dialog" aria-labelledby="sk-selected-port" data-selected="${dest}">
      <img class="sk-port-thumbnail" alt="" src="${artwork(state.mission === 'lit' && (dest === 'sunstep' || dest === 'glasshouse') ? dest + '-lit' : dest)}">
      <button type="button" class="sk-dismiss" aria-label="Close port details" data-action="${ui.register(close)}">×</button>
      <div class="sk-map-copy"><div class="sk-kicker">${current ? 'Moored here' : unlocked ? port.subtitle : 'Outer skyway · locked'}</div>
      <h2 id="sk-selected-port">${port.name}</h2>
      <p>${current ? 'Local exchange' : unlocked ? `${days}-day passage` : 'Relight the beacon to reach this port'} · ${GOODS[port.specialty].name}</p>
      <p class="sk-forecast">${forecast.summary} · wind toward ${forecast.bearing}, ${forecast.knots} kn</p>
      ${!current && unlocked ? routeLookout(state) : ''}
      <details class="sk-fold"><summary>Climate and trade on arrival</summary><p>${CLIMATES[dest].region}. ${seasonAt(state.day + days)} · day ${state.day + days}.</p>${marketOutlook(dest,state.day+days)}</details>
      <details class="sk-fold"><summary>Port trade &amp; services</summary><p>${CITY_ECONOMY[dest].tradeLead}</p><p>${CITY_ECONOMY[dest].institution} requests ${CITY_ECONOMY[dest].order.quantity} × ${GOODS[CITY_ECONOMY[dest].order.good].name}.</p></details>
      <details class="sk-fold"><summary>Recorded prices</summary>${rememberedPrices(state, dest)}</details>
      ${!current && unlocked && state.voyageCount === 0 ? '<p class="sk-departure-supplies"><b>Cleared to sail.</b> Rations and lift fuel are aboard. Provisions are trade cargo. You can leave with an empty hold.</p>' : ''}
      <div class="sk-actions">${
        current
          ? ui.button(
              'Visit local market',
              () => {
                ui.settings.destination = null
                ui.go('market')
              },
              { secondary: true },
            )
          : ui.button(
              unlocked ? 'Set sail →' : 'Route locked',
              () => {
                ui.settings.destination = null
                ui.act({ type: 'sail', to: dest })
              },
              { disabled: !unlocked },
            )
      }</div></div></aside>`
  }
  const objectives = chartObjectives(state)
  const orders = `<details class="sk-chart-orders"><summary>Captain’s orders · ${objectives.length}</summary><div>
    ${objectives.map(job => `<article><small>${job.offered ? 'Available commission' : 'Active order'}</small><h2>${job.title}</h2><p>${safe(job.detail)}</p>${ui.button('Locate ' + PORTS[job.destination].name, () => {
      ui.settings.destination = job.destination
      ui.refresh()
    }, { secondary: true })}</article>`).join('') || '<p>Your docket is clear. Visit a freight desk for another contract.</p>'}
    </div></details>`
  return `<div class="sk-mapstage"><div class="sk-map-scroll"><div class="sk-chart" aria-label="Chart of four skyports">
      <img src="${artwork('sky-chart')}" alt="" class="sk-chart-art"><canvas aria-hidden="true" data-map width="880" height="624"></canvas>${nodes}</div></div>
      <div class="sk-chart-plaque"><h1>Sky chart</h1><span>${PORTS[state.port].name} · ${seasonAt(state.day)} · day ${state.day}</span></div>${orders}${popover}</div>`
}

function freightDesk(state: GameState, ui: Controls) {
  const offer = freightOffer(state)
  let freight = '<p>No contracts posted today.</p>'
  if (state.freight) {
    const destination = state.freight.to
    freight = `<p>Deliver your consignment to <strong>${PORTS[destination].name}</strong>. The receiver pays ${coins(state.freight.pay)} on arrival.</p>
      <div class="sk-actions">${ui.button(
        'Plot delivery route',
        () => {
          ui.settings.destination = destination
          ui.go('chart')
        },
        { secondary: true },
      )}</div>`
  } else if (offer) {
    freight = `<p>${offer.special ? 'The tender skipper puts your name forward for a priority consignment.' : 'Carry a sealed consignment for the port office. The shipper supplies the cargo.'}</p>
      ${details([
        ['Destination', PORTS[offer.to].name],
        ['On delivery', coins(offer.pay)],
      ])}
      <div class="sk-actions">${ui.button('Take freight contract', () => ui.act({ type: 'takeFreight' }), { secondary: true })}</div>`
  }
  return `<aside class="sk-card"><div class="sk-card-head"><h2>Freight desk</h2></div>${freight}</aside>`
}

function lensInvoice(state: GameState, ui: Controls) {
  const shortfall = Math.max(0, INVOICE_COST - state.coins)
  return `<article class="sk-invoice">
    <header><div><div class="sk-kicker">Glasshouse Lensworks</div><h2>Lens invoice</h2></div><span class="sk-invoice-seal">Awaiting payment</span></header>
    <p>For the Skyway Beacon · Bill to the captain of <i>The Wayfarer</i></p>
    <table><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Charge</th></tr></thead>
      <tbody><tr><td>Beacon lens, ground and polished</td><td>1</td><td>${coins(INVOICE_COST)}</td></tr>
      <tr><td>Fitting and alignment</td><td>1</td><td>Included</td></tr></tbody>
      <tfoot><tr><th scope="row" colspan="2">Total due</th><td>${coins(INVOICE_COST)}</td></tr></tfoot></table>
    <div class="sk-invoice-funds">${metric('Cash on hand', coins(state.coins))}${metric(shortfall ? 'Still to earn' : 'After payment', coins(shortfall || state.coins - INVOICE_COST))}</div>
    <div class="sk-actions">${ui.button(`Pay invoice · ${coins(INVOICE_COST)}`, () => { ui.settings.firstLight = true; ui.act({ type: 'payInvoice' }) }, { disabled: shortfall > 0 })}
      ${ui.button('Visit market', () => ui.go('market'), { secondary: true })}</div></article>`
}

function firstLight(state: GameState, ui: Controls) {
  const openOuterChart = () => {
    ui.settings.destination = 'meridian'
    ui.go('chart')
  }
  return `<article class="sk-first-light"><div class="sk-scene">
    <img src="${artwork('glasshouse-lit')}" alt="The relit Skyway Beacon casting a gold beam over Glasshouse Reach at night">
    <header><div class="sk-kicker">The Skyway Beacon · Commission complete</div><h1>First light</h1></header>
    </div><div class="sk-layout"><section class="sk-card sk-light-copy"><blockquote class="sk-quote">Six weeks of dark. Then, from beyond the banks, a far-off pilot flashes a lamp in answer.</blockquote><p>Iona folds the certificate around a splinter of the old lens. “Carry that to Sen. He holds your 300 crowns.”</p>
    <div class="sk-rewards">${metric('Captain rank', 'Level II')}${metric('Skyway opened', 'Meridian Spire')}</div>
    <div class="sk-actions">${state.ability ? ui.button('Open captain’s log', () => ui.go('log'), { secondary: true }) : ui.button('Choose captain ability', () => ui.go('log'))}
    ${ui.button('Chart Meridian Spire →', openOuterChart, { secondary: !state.ability })}</div></section>${freightDesk(state, ui)}</div></article>`
}

function authority(state: GameState, ui: Controls) {
  const contact = PORTS[state.port]
  const wasRelitHere = ui.settings.firstLight && state.mission === 'lit'
  if (wasRelitHere) return firstLight(state, ui)

  const canAccept = state.port === 'sunstep' && state.mission === 'offered'
  const canPay = state.port === 'glasshouse' && state.mission === 'invoice'
  const quote = canPay
    ? '“Mind the edge, Captain. Three days at the wheel to get that curve. You’ve brought Vale’s letter? Good. I’ll put your name on the crate. Here’s the bill.”'
    : greeting(state)
  const speaker = contact.keeper
  const npc = characterContext(state, npcAtPort(state.port, 'authority'))
  const memories = npc.confidences.map((line, i) => `<details class="sk-fold" data-contact-topic><summary>${i === 0 ? 'What matters to you here?' : 'What would you tell me in confidence?'}</summary><p>${safe(line)}</p></details>`).join('')
  const lastTalk = npc.memories.length ? `<details class="sk-fold"><summary>Our last conversation</summary><p>${safe(npc.memories.at(-1)!)}</p></details>` : ''
  let job = ''
  if (canPay) {
    job = lensInvoice(state, ui)
  } else {
    const jobAction = canAccept
      ? ui.button('Accept commission', () => ui.act({ type: 'acceptMission' }))
      : state.port === 'glasshouse' && state.mission === 'accepted'
        ? ui.button('Hand Iona Vale’s commission', () => ui.act({ type: 'presentCommission' }))
      : state.port === 'meridian' && state.certificate === 'aboard'
        ? ui.button('Present certificate · collect 300 cr', () => ui.act({ type: 'deliverCertificate' }))
      : state.mission === 'lit' && !state.ability
        ? ui.button('Choose captain ability', () => ui.go('log'))
        : ui.button('Open sky chart', () => ui.go('chart'), { secondary: true })
    job = `<article class="sk-card"><div class="sk-card-head"><h2>The Skyway Beacon</h2>${state.mission === 'lit' ? '<span class="sk-tag">Completed</span>' : ''}</div><p>${missionNote(state)}</p><div class="sk-actions">${jobAction}</div></article>`
  }
  const portrait =
    state.port === 'meridian' ? 'talk-meridian' : null
  return `<header class="sk-dialogue-heading"><div class="sk-kicker">${contact.name} · Port authority</div><div class="sk-identity">
    ${portrait ? `<img src="${artwork(portrait)}" alt="">` : ''}<h1>${speaker}</h1></div></header>
    <div class="sk-office-dialogue" data-npc-id="${npc.id}"><p class="sk-kicker" aria-label="Relationship"> ${npc.relationship.label}</p><blockquote class="sk-quote">${safe(quote)}</blockquote><details class="sk-fold" data-contact-topic><summary>How did you come to this work?</summary><p>${safe(npc.publicHistory)}</p></details>${memories}${lastTalk}</div>
    ${job}${canPay && state.coins < INVOICE_COST ? '<details class="sk-fold sk-ledger-fold"><summary>A word from the loading dock</summary><p>A glazier chalks <i>Copperfall</i> on a stack of panes. “Their winter gardens are framed and roofless. I can cut all week and the yard still wants more.”</p></details>' : ''}
    ${freightDesk(state, ui)}`
}

function routeLookout(state: GameState): string {
  const { exposedValue, cargoValue, crowns, profile } = raiderToll(state)
  const manifest = `Carried wealth ${exposedValue} crowns · ${state.coins} in your purse + ${cargoValue} in appraised trade cargo.`
  if (state.voyageCount === 0 && state.port === 'sunstep') {
    return `<details class="sk-fold"><summary>Harbor Watch · free first passage</summary><p>Your escort carries chalk rounds. Training costs nothing and your hold is safe.</p><p>${manifest}</p></details>`
  }
  return `<details class="sk-fold"><summary>Raider lookout · ${crowns} crowns if hailed</summary><p>${manifest}</p><p>If intercepted, expect a ${profile.id} with ${armamentLabel(profile.cannons)} and ${profile.hull} hull. Its toll on this manifest is ${crowns} crowns.</p></details>`
}

function voyage(state: GameState, ui: Controls) {
  const leg = state.voyage
  if (!leg)
    return heading(PORTS[state.port].name, 'Moored in port') + ui.button('Return to harbor', () => ui.go('harbor'))
  const weather = voyageWeather(state)
  let title = 'On passage'
  let line = 'The last mooring line falls away.'
  let copy = 'Your solar sails draw taut. The chart table is lashed down and the lookout is at the rail.'
  let terms = ''
  let buttons = ui.button('Continue voyage →', () => ui.act({ type: 'continueVoyage' }))
  if (leg.phase === 'tender') {
    title = 'A tender adrift'
    line = 'A signal lamp winks from below the lane.'
    copy =
      'A work tender hangs dead in a pocket of cloud. The skipper asks for a tow. Helping costs a day of trading.'
    buttons =
      ui.button('Give them a tow · 1 day', () => ui.act({ type: 'tender', help: true })) +
      ui.button('Hold your course', () => ui.act({ type: 'tender', help: false }), { secondary: true })
  } else if (leg.phase === 'raider') {
    const toll = raiderToll(state)
    const foe = toll.profile
    const crew = { scout: 'a light boarding crew', cutter: 'trained boarders', corsair: 'a veteran boarding crew' }[foe.id]
    const odds = Math.round(100 * boardingOdds(state.ship.crew, boardingStrength(state) / state.ship.crew,
      state.ship, { hull: foe.hull, maxHull: foe.hull }, foe.crew))
    const canPayCargo = toll.settlement.cargo.length > 0 && toll.exposedValue >= toll.crowns
    const cargoTerms = tollSettlementLabel(toll.settlement)
    const canPayCash = state.coins >= toll.crowns
    title = 'A toll on the skyway'
    line = `“${toll.crowns} crowns for passage, Captain.”`
    copy = `Lookout sights the <strong>${foe.name}</strong> with ${armamentLabel(foe.cannons)}, ${foe.hull} hull and ${crew} (strength ${foe.crew}). Your ${state.ship.crew} hands have a ${odds}% boarding chance at the current hulls. Refuse and you must fight or reach the edge of the skyway.`
    terms = `<details class="sk-fold"><summary>Toll and surrender terms</summary><p>They count ${state.coins} crowns in your purse and ${toll.cargoValue} in cargo, worth ${toll.exposedValue} together. ${canPayCargo ? 'They accept ' + cargoTerms + '. ' : ''}If defeated, you surrender ${cargoTerms}. Commission papers and bonded mail stay aboard.</p></details>`
    const crates = toll.settlement.cargo.reduce((sum, lot) => sum + lot.quantity, 0)
    const cargoButton = cargoTerms.length <= 62 ? 'Hand over ' + cargoTerms : `Pay with ${crates} ${crates === 1 ? 'crate' : 'crates'}` +
      (toll.settlement.coins ? ` + ${toll.settlement.coins} crowns` : '') +
      (toll.settlement.change ? ` · receive ${toll.settlement.change} in change` : '')
    buttons = ui.button('Pay ' + toll.crowns + ' crowns', () => ui.act({ type: 'payToll', id: leg.id, payment: 'crowns' }), { disabled: !canPayCash }) +
      (canPayCargo ? ui.button(cargoButton, () => ui.act({ type: 'payToll', id: leg.id, payment: 'cargo' }), {secondary: canPayCash}) : '') +
      ui.button('Refuse · take the helm', () => ui.act({ type: 'engage' }), { secondary: canPayCash || canPayCargo })
    if (!canPayCargo && !canPayCash) copy += ' Your manifest cannot cover the toll.'
  } else if (leg.phase === 'battle') {
    title = 'Under fire'
    line = 'The gun crews stand ready.'
    copy = 'Your schooner is engaged with a raider.'
    buttons = ''
  }
  const picture =
    leg.phase === 'tender'
      ? 'tender'
      : leg.phase === 'raider' || leg.phase === 'battle'
        ? 'raider-encounter'
        : 'passage'
  return `<div class="sk-voyage"><div class="sk-scene"><img src="${artwork(picture)}" alt="">${paintedWeather(weather)}
    <header><div class="sk-kicker">En route</div><h1>${title}</h1><p class="weather-bearing">${weather.summary} · ${weather.bearing} ${weather.knots} kn</p></header></div>
    <article class="sk-card sk-voyage-brief"><div class="sk-voyage-story"><div class="sk-leg"><span>${PORTS[leg.from].name}</span><i class="sk-path" aria-hidden="true"></i><span>${PORTS[leg.to].name}</span></div>
    <blockquote class="sk-quote">${line}</blockquote><p>${copy}</p>${terms}</div><div class="sk-actions">${buttons}</div></article></div>`
}

export function renderInterior(
  root: HTMLElement,
  view: InteriorView,
  state: GameState,
  dispatch: (command: Command) => void,
  navigate: Navigate,
  recordContact: ContactWriter,
  inWorkshop = false,
): void {
  let settings = settingsByDocument.get(root.ownerDocument)
  if (!settings || settings.port !== state.port) {
    settings = { port: state.port, destination: null, focusPort: null, side: 'buy' }
    settingsByDocument.set(root.ownerDocument, settings)
  }
  if (settings.lastView === 'chart' && view !== 'chart') {
    settings.destination = null
    settings.focusPort = null
  }
  if (view !== 'authority') settings.firstLight = false
  settings.lastView = view
  const page = document.createElement('section')
  page.className = 'sk-interior'
  page.dataset.view = view
  const offices = {
    sunstep: 'authority',
    glasshouse: 'office-iona',
    copperfall: 'office-orr',
    meridian: 'meridian',
  }
  const art = {
    market: 'civic-' + state.port,
    civic: 'civic-' + state.port,
    authority: settings.firstLight && state.mission === 'lit' ? null : offices[state.port],
    shipyard: 'yard',
    chart: null,
    voyage: null,
    log: 'sky-chart',
  }[view]
  if (art) {
    page.classList.add('sk-illustrated')
    page.style.setProperty('--sk-art', `url("${artwork(art)}")`)
  }
  const callbacks: Callback[] = []
  const register = (callback: Callback) => String(callbacks.push(callback) - 1)
  const ui: Controls = {
    act: dispatch,
    go: navigate,
    settings,
    page,
    register,
    refresh: () => renderInterior(root, view, state, dispatch, navigate, recordContact, inWorkshop),
    button: (label, callback, options = {}) =>
      `<button type="button" class="sk-button ${options.secondary ? 'sk-secondary' : ''}" data-action="${register(callback)}" ${options.disabled ? 'disabled' : ''}>${label}</button>`,
  }
  const back =
    view === 'voyage'
      ? ''
      : `<button class="sk-crumb" data-action="${register(() => {
          settings.destination = null
          navigate('harbor')
        })}" aria-label="Return to harbor">← Harbor</button>`
  const content = { civic, market, shipyard, log: logbook, chart, authority, voyage }[view](state, ui)
  const insideRoom = !!art
  page.innerHTML =
    back +
    (insideRoom ? `<div class="sk-room-overlay"><div class="sk-room-ledger">${content}</div></div>` : content)
  if (view === 'authority') {
    const npc = npcAtPort(state.port, 'authority')
    const speaker = page.querySelector<HTMLElement>('.sk-office-dialogue')
    if (speaker) {
      const talk = document.createElement('button')
      talk.type = 'button'
      talk.className = 'sk-button sk-secondary'
      talk.textContent = 'Speak freely with ' + npcName(npc)
      talk.onclick = () => startDialogue(npc,recordContact)
      speaker.append(talk)
    }
    for (const topic of page.querySelectorAll<HTMLDetailsElement>('[data-contact-topic]')) {
      topic.addEventListener('toggle', () => {
        if (topic.open) recordContact({type: 'rememberNpc', npc, memory:'You asked me, “'+topic.querySelector('summary')!.textContent+'”'})
      })
    }
  }
  if (!inWorkshop && (view === 'market' || view === 'shipyard' || view === 'civic')) {
    const npc = npcAtPort(state.port, view)
    const sheet = page.querySelector<HTMLElement>('.sk-room-ledger')!
    const talk = document.createElement('button')
    talk.type = 'button'
    talk.className = 'sk-button sk-secondary'
    talk.textContent = 'Speak with ' + npcName(npc)
    talk.addEventListener('click', () => {
      const host = document.createElement('div')
      host.className = 'sk-station-host'
      page.append(host)
      sheet.inert = true
      mountStationTalk(host, state, npc, () => {
        host.remove()
        sheet.inert = false
        talk.focus({preventScroll: true})
      }, recordContact)
    })
    sheet.append(talk)
  }
  page.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('button[data-action]')
    if (button && !button.disabled) callbacks[Number(button.dataset.action)]?.()
    else if (view === 'chart' && settings.destination && !event.target.closest('.sk-map-popover, .sk-chart-orders')) {
      page.querySelector<HTMLButtonElement>('.sk-dismiss')?.click()
    }
  })
  page.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    const order = event.target.closest<HTMLElement>('.sk-order')
    if (!order) return
    const submit = order.querySelector<HTMLButtonElement>('.sk-submit')!
    const quantity = event.target.valueAsNumber
    const valid = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= Number(order.dataset.limit)
    submit.disabled = !valid
    submit.textContent = `${order.dataset.side === 'buy' ? 'Buy' : 'Sell'} · ${coins(valid ? Number(order.dataset.price) * quantity : 0)}`
  })
  root.replaceChildren(page)
  const map = page.querySelector<HTMLCanvasElement>('[data-map]')
  if (map) {
    drawMap(map, state, settings.destination)
    arrangeChart(page, settings)
  }
}

function arrangeChart(page: HTMLElement, settings: InteriorSettings) {
  const popover = page.querySelector<HTMLElement>('.sk-map-popover')
  if (!popover) {
    if (settings.focusPort)
      page.querySelector<HTMLButtonElement>(`[data-port="${settings.focusPort}"]`)?.focus({ preventScroll: true })
    settings.focusPort = null
    return
  }
  const marker = page.querySelector<HTMLElement>(`[data-port="${settings.destination}"]`)!
  const dismiss = popover.querySelector<HTMLButtonElement>('.sk-dismiss')!
  const orders = page.querySelector<HTMLDetailsElement>('.sk-chart-orders')!
  const notice = document.querySelector<HTMLElement>('#toast')
  function place() {
    const bounds = page.getBoundingClientRect()
    const pin = marker.getBoundingClientRect()
    const width = popover!.offsetWidth
    const ordersBox = orders.getBoundingClientRect()
    // On a narrow chart, stack the two papers. On a wide one, leave room beside the orders.
    const beside = ordersBox.left - bounds.left - 8 >= width + 8
    const topEdge = beside ? 8 : ordersBox.bottom - bounds.top + 8
    const rightEdge = beside ? ordersBox.left - bounds.left - 8 : bounds.width - 8
    const bottomEdge = notice && !notice.hidden
      ? Math.min(bounds.height, notice.getBoundingClientRect().top - bounds.top) - 8
      : bounds.height - 8
    popover!.style.maxHeight = Math.max(1, bottomEdge - topEdge) + 'px'
    const height = popover!.offsetHeight
    const cx = pin.left - bounds.left + pin.width / 2
    const cy = pin.top - bounds.top + pin.height / 2
    const left = cx < bounds.width / 2 ? cx + 28 : cx - width - 28
    popover!.style.left = Math.max(8, Math.min(rightEdge - width, left)) + 'px'
    const top = bounds.width < 560 ? (cy < bounds.height / 2 ? cy + 30 : cy - height - 30) : cy - height / 2
    popover!.style.top = Math.max(topEdge, Math.min(bottomEdge - height, top)) + 'px'
  }
  place()
  page.querySelector<HTMLElement>('.sk-map-scroll')!.addEventListener('scroll', place, { passive: true })
  popover.querySelectorAll('details').forEach(fold => fold.addEventListener('toggle', place))
  const observer = new ResizeObserver(() => {
    if (page.isConnected) place()
    else observer.disconnect()
  })
  observer.observe(page)
  observer.observe(orders)
  if (notice) observer.observe(notice)
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      dismiss.click()
    }
  })
  dismiss.focus({ preventScroll: true })
}

function drawMap(canvas: HTMLCanvasElement, state: GameState, dest: PortId | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  const point = (id: PortId): [number, number] => [(w * bearing[id][0]) / 100, (h * bearing[id][1]) / 100]
  for (let i = 0; i < PORT_IDS.length; i++)
    for (let j = i + 1; j < PORT_IDS.length; j++) {
      const a = PORT_IDS[i],
        b = PORT_IDS[j]
      const active = (a === state.port && b === dest) || (a === dest && b === state.port)
      const locked = !isUnlocked(state, a) || !isUnlocked(state, b)
      const [x1, y1] = point(a),
        [x2, y2] = point(b)
      ctx.setLineDash(active && !locked ? [9, 5] : locked ? [2, 8] : [5, 7])
      ctx.lineWidth = active ? 2.8 : 1.1
      ctx.strokeStyle = active && !locked ? '#e0bd82' : locked ? '#61847882' : '#98a58b'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo((x1 + x2) / 2 - 8, (y1 + y2) / 2 - 18, x2, y2)
      ctx.stroke()
    }
}
