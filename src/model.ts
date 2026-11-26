import { validBattleSnapshot, type BattleEnding, type BattleSnapshot } from './battle-state'
import { acceptsCommand, newRegister, officerOffer, prizeManifest, COMMANDER_NAMES, validPrizeTerms, validRegister,
  canLearnPerk, hasCaptainPerk, qualifiedMate, creditMission, CAPTAIN_PERKS, CAPTAIN_XP_PER_LEVEL, LAST_CAPTAIN_LEVEL, type CaptainPerk, type ServingHand, CREW_PROFILES,
  type CommandRegister, type PrizeCommand, type PrizeTerms } from './prize-command'
export * from './prize-command'
import { RAIDER_PROFILES, appraise, legacyPirateSeed, legacyPirateTerms, raiderToll, rollPirate, tollSettlementLabel, validPirateTerms, type PirateTerms, type TollSettlement } from './raiders'
export * from './raiders'
import { seasonalAdjustment } from './seasonal-trade'
import { DRILL_STAGES, GUN_POSITIONS, nextStage, type DrillStage } from './drill'
import {
  ABILITY_IDS,
  BEACON_COMMISSION,
  BONDED_MAIL,
  ENCOUNTERS,
  GOODS,
  GOOD_IDS,
  INVOICE_COST,
  PORTS,
  PORT_IDS,
  TENDER_DEED,
  UPGRADE_IDS,
  type AbilityId,
  type GoodId,
  type PortId,
  type UpgradeId,
} from './data'
import { allotment, CITY_ECONOMY, exchangeCycle } from './city-economy'
import { changeContact, validContacts, witnessCityOrder, type Contacts, type ContactCommand } from './characters'
import { buyerOffers, buyerOrders, deliverableQuantity, expireBuyerOrders, reconcileBuyerCargo, validBuyerLedger,
  type BuyerCommand, type BuyerLedger } from './buyer-orders'
import { gardenWorkReceipt, harvestLot, validGarden, type WinterGarden } from './winter-garden'
export * from './winter-garden'
export * from './buyer-orders'
export * from './data'

export interface Quote {
  buy: number
  sell: number
}
interface CargoBasis {
  quantity: number
  cost: number
}
export interface CargoLot extends CargoBasis {
  /** The pool before its first partial withdrawal. New purchases start a fresh pool. */
  basis?: CargoBasis
}
export interface Ship {
  hold: number
  hull: number
  maxHull: number
  guns: number
  cannons: number
  crew: number
  veterans: number
}
export interface MarketVisit {
  day: number
  prices: Partial<Record<GoodId, Quote>>
  stock?: Partial<Record<GoodId, number>>
}
export interface Exchange {
  cycle: number
  purchases: Partial<Record<PortId, Partial<Record<GoodId, number>>>>
  orders: PortId[]
  services: PortId[]
}
export interface Freight {
  from: PortId
  to: PortId
  pay: number
  special: boolean
}
export interface Voyage {
  id: number
  from: PortId
  to: PortId
  phase: 'underway' | 'tender' | 'raider' | 'battle' | 'prize'
  battle?: BattleSnapshot
  prize?: PrizeTerms
  pirate?: PirateTerms
}
export interface GameState {
  version: 1
  pirateSeed: number
  port: PortId
  day: number
  coins: number
  cargo: Record<GoodId, CargoLot>
  ship: Ship
  command: CommandRegister
  level: number
  xp: number
  tradeProfitRemainder: number
  notoriety: number
  ability: AbilityId | null
  mission: 'offered' | 'accepted' | 'invoice' | 'lit'
  firstWatch: 'new' | 'arrived' | 'briefed'
  certificate: 'none' | 'aboard' | 'paid'
  tender: 'unseen' | 'helped' | 'passed'
  specialFreightTaken: boolean
  voyageCount: number
  voyage: Voyage | null
  drill: DrillStage | null
  exchange: Exchange
  buyers: BuyerLedger
  garden: WinterGarden | null
  contacts: Contacts
  pricesSeen: Partial<Record<PortId, MarketVisit>>
  freight: Freight | null
  log: { day: number; text: string }[]
  notice: string
  pendingNotices: string[]
}

export type BattleResult = 'won' | 'boarded' | 'escaped' | 'lost' | 'enemyWreck' | 'ownWreck' | 'mutualWreck' | 'withdrawn' | 'yielded' | 'surrendered'
export const CAMPAIGN_RESULTS: Record<BattleEnding, BattleResult> = {
  victory:'enemyWreck', defeat:'ownWreck', escaped:'escaped', boarded:'surrendered', yielded:'yielded', withdrawn:'withdrawn', mutualWreck:'mutualWreck',
}
export type Command =
  | ContactCommand
  | BuyerCommand
  | PrizeCommand
  | { type: 'chooseHarvest'; day: number; decision: 'buy' | 'pass' }
  | { type: 'acceptMission' | 'presentCommission' | 'deliverCertificate' | 'payInvoice' | 'continueVoyage' | 'engage' | 'evade' | 'takeFreight' | 'practiceDrill' | 'fillCityOrder' | 'useCityService' }
  | { type: 'payToll'; id: number; payment: 'cargo' | 'crowns' }
  | { type: 'endDrill'; skip: boolean }
  | { type: 'buy' | 'sell'; good: GoodId; quantity: number }
  | { type: 'sail'; to: PortId }
  | { type: 'tender'; help: boolean }
  | { type: 'resolveBattle'; id: number; result: BattleResult; hull: number; enemyHull?: number }
  | { type: 'upgrade'; upgrade: UpgradeId }
  | { type: 'chooseAbility'; ability: CaptainPerk }
export type GameCommand = Command

export interface UpgradeOffer {
  name: string
  description: string
  cost: number
  available: boolean
}
export const SAVE_KEY = 'skyrates.save.v1'
const charterLevel = PORTS[BEACON_COMMISSION.opens].requiredLevel

export function initialState(pirateSeed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]): GameState {
  const state: GameState = {
    version: 1,
    pirateSeed,
    port: BEACON_COMMISSION.home,
    day: 1,
    coins: BEACON_COMMISSION.startingCoins,
    cargo: {
      provisions: { quantity: 0, cost: 0 },
      glass: { quantity: 0, cost: 0 },
      machinery: { quantity: 0, cost: 0 },
      grafts: { quantity: 0, cost: 0 },
      prisms: { quantity: 0, cost: 0 },
      governors: { quantity: 0, cost: 0 },
      soundings: { quantity: 0, cost: 0 },
    },
    command: newRegister(),
    ship: { hold: 12, hull: 100, maxHull: 100, guns: 0, cannons: 1, crew: 6, veterans: 1 },
    level: 1,
    xp: 0,
    tradeProfitRemainder: 0,
    notoriety: 0,
    ability: null,
    mission: 'offered',
    firstWatch: 'new',
    certificate: 'none',
    tender: 'unseen',
    specialFreightTaken: false,
    voyageCount: 0,
    voyage: null,
    drill: null,
    exchange: freshExchange(1),
    buyers: { seed: 0, orders: [] },
    garden: null,
    contacts: {},
    pricesSeen: {},
    freight: null,
    log: [{ day: 1, text: 'Took the helm at Sunstep Quay. Harbormaster Vale has a commission waiting.' }],
    notice: '',
    pendingNotices: [],
  }
  rememberMarket(state)
  return state
}

export function routeDays(from: PortId, to: PortId): number {
  return PORTS[from].daysTo[to]
}

export function isUnlocked(state: GameState, port: PortId): boolean {
  return PORT_IDS.includes(port) && state.level >= PORTS[port].requiredLevel
}

export function cargoUsed(state: GameState): number {
  return GOOD_IDS.reduce((used, good) => used + state.cargo[good].quantity, 0)
}

export function priceAt(state: GameState, port: PortId, good: GoodId): Quote {
  // A three-day price cycle keeps remembered quotes useful while ports retain their specialties.
  const cycle = (Math.floor((state.day - 1) / 3) + PORT_IDS.indexOf(port) + GOOD_IDS.indexOf(good)) % 3
  const price = Math.max(3, PORTS[port].prices[good] + cycle - 1 + seasonalAdjustment(port, good, state.day))
  const wholesale = Math.floor(price * 0.9)
  const sell = Math.max(1, Math.min(price - 2, wholesale - 1))
  const buy = hasCaptainPerk(state, 'broker') ? wholesale : price
  return { buy, sell }
}

function freshExchange(day: number): Exchange {
  return { cycle: exchangeCycle(day), purchases: {}, orders: [], services: [] }
}

function currentExchange(state: GameState): Exchange {
  return state.exchange.cycle === exchangeCycle(state.day) ? state.exchange : freshExchange(state.day)
}

export function stockAt(state: GameState, port: PortId, good: GoodId): number {
  const bought = currentExchange(state).purchases[port]?.[good] ?? 0
  return Math.max(0, allotment(port, good, state.day) - bought)
}

function rememberMarket(state: GameState, port = state.port) {
  state.pricesSeen[port] = {
    day: state.day,
    prices: Object.fromEntries(GOOD_IDS.map(good => [good, priceAt(state, port, good)])),
    stock: Object.fromEntries(GOOD_IDS.map(good => [good, stockAt(state, port, good)])),
  }
}

export function cityOrder(state: GameState) {
  const order = CITY_ECONOMY[state.port].order
  const pay = order.quantity * priceAt(state, state.port, order.good).sell + order.premium
  const filled = currentExchange(state).orders.includes(state.port)
  return { ...order, pay, filled, ready: !filled && state.cargo[order.good].quantity >= order.quantity }
}

export function cityService(state: GameState) {
  const used = currentExchange(state).services.includes(state.port)
  if (state.port === 'glasshouse') {
    return { name: 'Reserve a cooling rack', description: 'Bring two solar glass and eight crowns. The choir will anneal one optical prism blank for your hold.', used, ready: !used && state.coins >= 8 && state.cargo.glass.quantity >= 2 }
  }
  if (state.port === 'meridian') {
    return { name: 'Buy the pilot dispatch', description: 'Six crowns buys today’s courier sheet of prices and remaining lots at all four ports. Read it in your sky chart.', used, ready: !used && state.coins >= 6 }
  }
  return null
}

export function boardingStrength(state: GameState): number {
  return (state.ship.crew + 1.5 * state.ship.veterans) * (hasCaptainPerk(state, 'leader') ? 1.25 : 1)
}

export function prestigeTitle(state: GameState): string {
  if (state.notoriety >= 6) return 'Famed sky captain'
  if (state.notoriety >= 3) return 'Known on the skyways'
  if (state.notoriety >= 1) return 'Familiar face'
  return 'Unknown captain'
}

export function greeting(state: GameState): string {
  switch (state.port) {
    case 'sunstep':
      if (state.mission === 'lit')
        return '“I saw it from the quay last night. First light on the outer route in six weeks.” Vale makes room for you at the chart table.'
      if (state.mission === 'offered')
        return '“You carried those letters up my steps in all weathers. Now there are six bags under my desk. The beacon toll fund is frozen until an outer pilot witnesses the light. Will you carry the risk with us?”'
      if (state.notoriety > 0)
        return 'Vale puts down her manifest. “The pilots have been talking about you. How fares the beacon?”'
      return '“A light for every ship past the horizon,” Vale says. “You’ll find the keeper above the glassworks.”'
    case 'glasshouse':
      if (state.mission === 'accepted') return 'Iona dries her hands on her apron. “That looks like Vale’s seal. Shall we see what she’s sent me?”'
      if (state.mission === 'invoice')
        return `Iona sets a brass-bound crate on the counter. “Lens is cut. Fitting is included. That’ll be ${INVOICE_COST} crowns.” A dockworker mentions Copperfall is buying glass for its greenhouses.`
      if (state.mission === 'lit')
        return '“Come up and see it tonight,” Iona says. A ribbon of light sweeps the glazing sheds.'
      return 'The keeper polishes a lens beside the cold lamp. “Vale at Sunstep is still looking for a captain.”'
    case 'copperfall':
      if (state.tender === 'helped' && !state.specialFreightTaken)
        return '“Neri says you towed her in. She left you a freight docket. I put it aside on my desk.”'
      if (state.tender === 'helped')
        return '“Neri vouches for you. Pull up a chair, Captain.”'
      if (state.tender === 'passed')
        return 'Neri has lashed a spare towline to the tender. At the desk, the yardmaster points you to the ordinary freight board.'
      return '“Our furnace crews can make a keel in a week,” Orr says. “But every pane in our new greenhouses has to be shipped in.”'
    case 'meridian':
      return state.notoriety >= 3
        ? '“There’s the beacon captain!” Pilot Sen beckons you to the front berth. “We’ve a hungry weather crew up here.”'
        : 'Pilot Sen ties off your bowline. “Welcome to the outer skyways.”'
  }
}

export function freightOffer(state: GameState): Omit<Freight, 'from'> | null {
  if (state.voyage || state.freight) return null
  const contract = TENDER_DEED.contract
  if (state.port === contract.from && state.tender === 'helped' && !state.specialFreightTaken) {
    return { to: contract.to, pay: contract.pay, special: true }
  }
  const to = PORTS[state.port].mailTo
  return { to, pay: BONDED_MAIL.basePay + BONDED_MAIL.payPerDay * routeDays(state.port, to), special: false }
}

export function upgradeOffer(state: GameState, upgrade: UpgradeId): UpgradeOffer {
  const offer = shipOffer(state, upgrade)
  return { ...offer, available: offer.available && CITY_ECONOMY[state.port].upgrades.includes(upgrade) }
}

function shipOffer(state: GameState, upgrade: UpgradeId): UpgradeOffer {
  const ship = state.ship
  switch (upgrade) {
    case 'hold':
      return {
        name: 'Hold extension',
        description: 'Fit racks for 4 more crates.',
        cost: 48 + (ship.hold - 12) * 5,
        available: ship.hold < 32,
      }
    case 'hull':
      return {
        name: 'Hull plating',
        description: 'Increase maximum and current hull by 25.',
        cost: 65 + (ship.maxHull - 100),
        available: ship.maxHull < 200,
      }
    case 'guns':
      return {
        name: ship.cannons < GUN_POSITIONS.length ? 'Fit another cannon' : 'Cannon refit',
        description: [
          '', 'Add a starboard bow gun.', 'Fit a second port gun for a broadside.',
          'Fit a second starboard gun for a broadside.', 'Fit a third port gun amidships.',
          'Fit a third starboard gun amidships.', 'Improve power and reload speed on all six guns.',
        ][ship.cannons],
        cost: 70 + 40 * ship.guns,
        available: ship.cannons < GUN_POSITIONS.length || ship.guns < GUN_POSITIONS.length - 1,
      }
    case 'crew':
      return {
        name: 'Hire deckhands',
        description: 'Sign on two novice deckhands.',
        cost: 26,
        available: ship.crew + 2 <= 24,
      }
    case 'veteran':
      return {
        name: 'Hire a veteran',
        description: 'Sign on one fighter worth 2½ novice hands in a boarding action.',
        cost: 44,
        available: ship.crew < 24,
      }
    case 'repair':
      return {
        name: 'Repair hull',
        description: 'Restore the hull to full strength.',
        cost: Math.ceil((ship.maxHull - ship.hull) / 2),
        available: ship.hull < ship.maxHull,
      }
  }
}

function record(state: GameState, text: string) {
  state.notice = text
  state.log.unshift({ day: state.day, text })
}

function experience(state: GameState, amount: number) {
  // The outer chart is a charter privilege earned by restoring the beacon.
  state.xp = state.level === 1 ? Math.min(90, state.xp + amount) : state.xp + amount
  if (state.level > 1) {
    const level = Math.min(LAST_CAPTAIN_LEVEL, 1 + Math.floor(state.xp / CAPTAIN_XP_PER_LEVEL))
    if (level > state.level) {
      state.pendingNotices.push(`Reached captain level ${level}. Spend your earned perk points in the captain’s log.`)
      state.level = level
    }
  }
}

export const TRADE_PROFIT_PER_XP = 10

export function awardTradeExperience(state: GameState, realizedProfit: number): void {
  if (realizedProfit <= 0) return
  const carry = state.tradeProfitRemainder + (realizedProfit % TRADE_PROFIT_PER_XP)
  const earned = Math.floor(realizedProfit / TRADE_PROFIT_PER_XP) + Math.floor(carry / TRADE_PROFIT_PER_XP)
  state.tradeProfitRemainder = carry % TRADE_PROFIT_PER_XP
  experience(state, earned)
}

function arrive(state: GameState, encounterOutcome = '') {
  const voyage = state.voyage
  if (!voyage) return
  const previous = voyage.from
  state.port = voyage.to
  state.voyage = null
  rememberMarket(state)
  record(state, 'Docked at ' + PORTS[state.port].name + ' after leaving ' + PORTS[previous].name + '.')
  if (state.freight?.to === state.port) {
    const job = state.freight
    state.coins += job.pay
    state.freight = null
    creditMission(state)
    experience(state, job.special ? TENDER_DEED.contract.xp : BONDED_MAIL.xp)
    record(
      state,
      (job.special ? 'Delivered Neri’s freight' : 'Delivered the bonded freight') +
        ' and earned ' +
        job.pay +
        ' crowns.',
    )
  }
  if (state.port === BEACON_COMMISSION.keeperPort && state.mission === 'accepted') {
    record(state, 'Moored below the glassworks. Iona receives dispatches at the lamp office above the furnaces.')
  }
  const contract = TENDER_DEED.contract
  if (state.port === contract.from && state.tender === 'helped' && !state.specialFreightTaken) {
    record(
      state,
      `Skipper Neri remembers your tow. A freight run to ${PORTS[contract.to].name} is yours for ${contract.pay} crowns.`,
    )
  }
  if (encounterOutcome) state.notice = encounterOutcome + ' ' + state.notice
}

function addCargo(lot: CargoLot, quantity: number, cost: number) {
  lot.quantity += quantity
  lot.cost += cost
  delete lot.basis
}

function remainingCargoCost(basis: CargoBasis, remaining: number) {
  // Round the cost of all crates removed from this pool once, to the nearest crown.
  // Use integer arithmetic even for a large hold in an older save.
  const units = BigInt(basis.quantity)
  const used = BigInt(basis.quantity - remaining)
  return basis.cost - Number((BigInt(basis.cost) * used + units / 2n) / units)
}

export function releaseCargo(lot: CargoLot, quantity: number): number {
  const remaining = lot.quantity - quantity
  const basis = lot.basis ?? { quantity: lot.quantity, cost: lot.cost }
  const remainingCost = remaining === 0 ? 0 : remainingCargoCost(basis, remaining)
  const releasedCost = lot.cost - remainingCost
  lot.quantity = remaining
  lot.cost = remainingCost
  // A uniform remainder has no fractional crowns left to allocate.
  if (remaining > 1 && remainingCost % remaining !== 0) lot.basis = basis
  else delete lot.basis
  return releasedCost
}

function settleToll(state: GameState, settlement: TollSettlement) {
  for (const { good, quantity } of settlement.cargo) releaseCargo(state.cargo[good], quantity)
  state.coins += settlement.change - settlement.coins
}

function trade(state: GameState, action: Extract<Command, { good: GoodId }>): boolean {
  const { good, quantity } = action
  if (!GOOD_IDS.includes(good) || !Number.isSafeInteger(quantity) || quantity <= 0) return false
  const lot = state.cargo[good]
  const quote = priceAt(state, state.port, good)
  if (action.type === 'buy') {
    const total = quantity * quote.buy
    if (total > state.coins || quantity > state.ship.hold - cargoUsed(state) || quantity > stockAt(state, state.port, good)) return false
    state.exchange = currentExchange(state)
    const bought = state.exchange.purchases[state.port] ??= {}
    bought[good] = (bought[good] ?? 0) + quantity
    state.coins -= total
    addCargo(lot, quantity, total)
    record(state, 'Bought ' + quantity + ' ' + GOODS[good].name.toLowerCase() + ' for ' + total + ' crowns.')
  } else {
    if (quantity > lot.quantity) return false
    const total = quantity * quote.sell
    const cost = releaseCargo(lot, quantity)
    state.coins += total
    const profit = total - cost
    awardTradeExperience(state, profit)
    const result = profit === 0 ? 'Broke even.' : `${Math.abs(profit)}-crown ${profit > 0 ? 'profit' : 'loss'}.`
    record(state, `Sold ${quantity} ${GOODS[good].name.toLowerCase()} for ${total} crowns. ${result}`)
  }
  rememberMarket(state)
  return true
}

export function passageEvent(id: number, tender: GameState['tender']): 'safe' | 'tender' | 'raider' {
  if (id <= ENCOUNTERS.safeOpeningVoyages) return 'safe'
  if (tender === 'unseen' && id >= ENCOUNTERS.tenderFromVoyage) return 'tender'
  return id % ENCOUNTERS.raiderInterval === 0 ? 'raider' : 'safe'
}

function applyVoyageCommand(state: GameState, action: Command): boolean {
  const voyage = state.voyage
  if (!voyage) return false
  switch (action.type) {
    case 'continueVoyage': {
      if (voyage.phase !== 'underway') return false
      const event = passageEvent(voyage.id, state.tender)
      if (event === 'safe') {
        arrive(state)
      } else if (event === 'tender') {
        voyage.phase = 'tender'
        state.notice = 'A tender hangs under a torn solar sail. Its skipper signals for a tow.'
      } else {
        voyage.phase = 'raider'
        state.notice = 'A raider blocks your passage and signals its toll.'
      }
      return true
    }
    case 'tender':
      if (voyage.phase !== 'tender') return false
      if (action.help) {
        state.tender = 'helped'
        creditMission(state)
        state.day += TENDER_DEED.towDays
        state.notoriety += TENDER_DEED.notoriety
        experience(state, TENDER_DEED.xp)
        record(
          state,
          `Gave Skipper Neri’s tender a tow. She works out of ${PORTS[TENDER_DEED.contract.from].name}.`,
        )
      } else {
        state.tender = 'passed'
        record(state, 'Passed the stranded tender and kept to the sailing schedule.')
      }
      arrive(state, state.notice)
      return true
    case 'payToll': {
      if (voyage.phase !== 'raider' || action.id !== voyage.id) return false
      const toll = raiderToll(state)
      let payment: string
      if (action.payment === 'cargo' && toll.settlement.cargo.length > 0 && toll.exposedValue >= toll.crowns) {
        settleToll(state, toll.settlement)
        payment = tollSettlementLabel(toll.settlement)
      } else if (action.payment === 'crowns' && state.coins >= toll.crowns) {
        state.coins -= toll.crowns
        payment = toll.crowns + ' crowns'
      } else {
        return false
      }
      record(state, toll.crowns ? 'Paid the raider ' + payment + ' for passage.' : 'The raider waved us through without a toll.')
      arrive(state, state.notice)
      return true
    }
    case 'evade': // An older client's escape order still requires taking the helm.
    case 'engage':
      if (voyage.phase !== 'raider') return false
      voyage.phase = 'battle'
      state.notice = 'Battle stations. The raider is closing.'
      return true
    case 'offerCommand':
    case 'commissionPrize':
    case 'releasePrize':
      return settlePrize(state, action)
    case 'resolveBattle':
      return finishBattle(state, action)
    default:
      return false
  }
}

function validCombatCheckpoint(value: unknown): value is BattleSnapshot {
  if (!validBattleSnapshot(value)) return false
  const {terminal, player, enemy, playerCrew, enemyCrew} = value
  if (!terminal) return true
  if (player.hull === 0 && enemy.hull === 0) return terminal === 'mutualWreck'
  if (player.hull === 0) return terminal === 'defeat'
  if (enemy.hull === 0) return terminal === 'victory'
  if (playerCrew === 0 && enemyCrew === 0) return terminal === 'withdrawn'
  if (playerCrew === 0) return terminal === 'yielded'
  if (enemyCrew === 0) return terminal === 'boarded'
  return terminal === 'escaped'
}

export function checkpointBattle(state: GameState, id: number, snapshot: BattleSnapshot): GameState {
  const voyage = state.voyage
  if (!voyage || voyage.id !== id || voyage.phase !== 'battle' || voyage.battle?.terminal || !validCombatCheckpoint(snapshot)) return state
  return { ...state, voyage: { ...voyage, battle: structuredClone(snapshot) } }
}

function finishBattle(state: GameState, action: Extract<Command,{type:'resolveBattle'}>): boolean {
  const leg = state.voyage
  if (!leg || leg.phase !== 'battle' || leg.id !== action.id || !Number.isFinite(action.hull)) return false
  const terminal = leg.battle?.terminal
  let outcome = action.result
  if (terminal && CAMPAIGN_RESULTS[terminal] !== outcome) return false
  // Legacy clients reported only victory or a successful boarding action.
  if (outcome === 'won') outcome = 'enemyWreck'
  if (outcome === 'boarded') outcome = 'surrendered'
  const profile = raiderToll(state).profile
  const ourHull = terminal ? leg.battle!.player.hull : action.hull
  const theirHull = terminal ? leg.battle!.enemy.hull : action.enemyHull ?? profile.hull
  if (!Number.isFinite(theirHull)) return false
  state.ship.hull = Math.min(state.ship.maxHull, Math.max(1, Math.ceil(ourHull)))
  if (outcome === 'surrendered') {
    if (ourHull <= 0 || theirHull <= 0 || theirHull > profile.hull) return false
    leg.phase = 'prize'
    leg.prize = { hull: theirHull, offer: 'unasked' }
    delete leg.battle
    state.notoriety++
    experience(state,12)
    record(state, `The ${profile.name.toLowerCase()} struck its colors. Both ships are afloat. The skipper awaits your terms.`)
    return true
  }
  switch (outcome) {
    case 'enemyWreck':
      state.notoriety++
      state.coins += 25
      experience(state,12)
      record(state, 'The raider sank. Claimed the 25-crown defense award at the next berth.')
      break
    case 'lost':
    case 'yielded':
    case 'ownWreck': {
      const { settlement } = raiderToll(state)
      settleToll(state, settlement)
      if (outcome !== 'yielded') state.ship.hull = Math.max(state.ship.hull, Math.ceil(state.ship.maxHull * 0.35))
      const ending = outcome === 'ownWreck' ? 'The Wayfarer fell. A salvage tender brought the crew and shattered keel to a repair berth.' : 'Struck colors with the crews aboard.'
      record(state, ending + ' Settled the raider’s claim with ' + tollSettlementLabel(settlement) + '.')
      break
    }
    case 'mutualWreck':
      state.ship.hull = Math.ceil(state.ship.maxHull * 0.35)
      record(state,'Both ships went down. A harbor tender recovered the Wayfarer’s crew and keel for emergency repairs.')
      break
    case 'withdrawn':
      record(state,'Both exhausted crews withdrew. The Wayfarer continued with her cargo and the damage she sustained.')
      break
    case 'escaped':
      record(state,'Broke contact with the raider and reached friendly skies.')
      break
    default:
      return false
  }
  arrive(state,state.notice)
  return true
}

function settlePrize(state: GameState, action: Extract<PrizeCommand,{id:number}>): boolean {
  const leg = state.voyage
  if (!leg || leg.phase !== 'prize' || leg.id !== action.id || !leg.prize || !leg.pirate) return false
  const prize = leg.prize
  if (action.type === 'offerCommand') {
    if (!hasCaptainPerk(state,'articles') || prize.offer !== 'unasked') return false
    prize.offer = acceptsCommand(state,leg.id) ? 'accepted' : 'refused'
    record(state, prize.offer === 'accepted' ? 'The skipper signed the articles. You can commission the prize under their command.' :
      'The skipper declined the articles. You may appoint your own qualified officer or release the ship.')
    return true
  }
  const cargo = prizeManifest(state,leg.pirate.opponent,leg.id)
  if (action.type === 'commissionPrize') {
    let captain: ServingHand | undefined
    switch (action.commander) {
      case 'hired':
        if (!state.command.hired) return false
        state.command.hired = false
        break
      case 'mate': {
        const mate = qualifiedMate(state)
        if (!mate) return false
        captain = {...mate,role:'captain',coached:false}
        state.command.aboard = state.command.aboard.filter(hand => hand.id !== mate.id)
        break
      }
      case 'skipper':
        if (prize.offer !== 'accepted') return false
        break
      default: return false
    }
    state.command.prizes.push({ id:leg.id, class:leg.pirate.opponent, hull:prize.hull, commander:action.commander, ...(captain ? {captain} : {}), port:leg.to, cargo })
    record(state, `${captain ? CREW_PROFILES[captain.id].name : COMMANDER_NAMES[action.commander]} took command of the captured ${leg.pirate.opponent}. Its hull and manifest are registered at the ${PORTS[leg.to].name} shipyard.`)
  } else if (action.type === 'releasePrize') {
    if (!Number.isSafeInteger(action.crates) || action.crates < 0 || action.crates > cargo.quantity || action.crates > state.ship.hold - cargoUsed(state)) return false
    if (action.crates) addCargo(state.cargo[cargo.good],action.crates,0)
    record(state, action.crates ? `Took ${action.crates} crates of ${GOODS[cargo.good].name.toLowerCase()} under the surrender terms and released the ship with the rest of its manifest.` :
      'Granted safe passage and released the surrendered ship with its whole manifest.')
  } else return false
  arrive(state,state.notice)
  return true
}

export function pickupQuantity(state: GameState, id: string): number {
  const order = buyerOrders(state).find(ticket => ticket.id === id)
  if (!order || order.kind !== 'delivery' || state.port !== order.source) return 0
  const unitPrice = priceAt(state, state.port, order.good).buy
  return Math.min(order.quantity - order.delivered - order.loaded, state.ship.hold - cargoUsed(state),
    stockAt(state, state.port, order.good), Math.floor(state.coins / unitPrice))
}

function applyBuyerCommand(state: GameState, action: BuyerCommand): boolean {
  if (action.type === 'acceptBuyerOrder') {
    const offer = buyerOffers(state).find(ticket => ticket.id === action.id)
    if (!offer) return false
    state.buyers.orders.push({ ...offer, status: 'signed', delivered: 0, loaded: 0 })
    record(state, `Signed “${offer.title}” for ${offer.buyer}. Deliver to ${PORTS[offer.destination].name} by day ${offer.dueDay}.`)
    return true
  }
  const order = buyerOrders(state).find(ticket => ticket.id === action.id)
  if (!order) return false
  if (action.type === 'cancelBuyerOrder') {
    order.status = 'released'
    order.loaded = 0
    record(state, `Released “${order.title}”. Any cargo aboard stays in your hold.`)
    return true
  }
  if (action.type === 'pickupBuyerOrder') {
    const quantity = pickupQuantity(state, order.id)
    if (!quantity || action.delivered !== order.delivered || action.loaded !== order.loaded) return false
    if (!trade(state, { type: 'buy', good: order.good, quantity })) return false
    order.loaded += quantity
    state.log[0].text += ` The clerk stamped the shipment for ${order.buyer}.`
    state.notice = state.log[0].text
    return true
  }
  const quantity = deliverableQuantity(state, order.id)
  if (action.type !== 'deliverBuyerOrder' || !quantity || action.delivered !== order.delivered) return false
  const cost = releaseCargo(state.cargo[order.good], quantity)
  const proceeds = quantity * order.rate
  state.coins += proceeds
  awardTradeExperience(state, proceeds - cost)
  order.delivered += quantity
  if (order.kind === 'delivery') order.loaded -= quantity
  const remaining = order.quantity - order.delivered
  let gardenReceipt = ''
  if (!remaining) {
    order.status = 'filled'
    creditMission(state)
    if (!state.garden && (order.id === 'fen-first-panes' || /^fen-garden-\d+-repair$/.test(order.id))) {
      state.garden = { repairedDay: state.day, jobs: [], lastLot: null }
      gardenReceipt = ' Four solar panes seal the greenhouse roof. Fen has set aside the first picking of winter pears for you. Visit the Winter Garden counter in Copperfall Yard.'
    } else if (order.buyer === 'Fen Alder') gardenReceipt = gardenWorkReceipt(state, order.id, order.title)
  }
  record(state, `Delivered ${quantity} × ${GOODS[order.good].name} for ${order.buyer} at ${order.rate} crowns each. Received ${proceeds} crowns against ${cost} in cargo costs. ` +
    (remaining ? `${remaining} still due through day ${order.dueDay}.` : 'Order filled.') + gardenReceipt)
  return true
}

function applyDockCommand(state: GameState, action: Command): boolean {
  switch (action.type) {
    case 'prepareCommand': {
      if (state.port !== 'copperfall' || !['hire','coach','appoint','standDown'].includes(action.course)) return false
      const offer = officerOffer(state,action.course,action.sailor)
      if (!offer.eligible || state.coins < offer.cost) return false
      state.coins -= offer.cost
      if (action.course === 'hire') state.command.hired = true
      const hand = state.command.aboard.find(member => member.id === action.sailor)
      if (hand && action.course === 'coach') hand.coached = true
      if (hand && action.course === 'appoint') hand.role = 'mate'
      if (hand && action.course === 'standDown') hand.role = 'deckhand'
      record(state, offer.title + (offer.cost ? ` · ${offer.cost} crowns paid at the shipyard.` : '. The Wayfarer’s muster is updated.'))
      return true
    }
    case 'unloadPrize': {
      const ship = state.command.prizes.find(p => p.id === action.id && p.port === state.port)
      if (!ship || action.remaining !== ship.cargo.quantity) return false
      const n = Math.min(ship.cargo.quantity, state.ship.hold - cargoUsed(state))
      if (n < 1) return false
      addCargo(state.cargo[ship.cargo.good],n,0)
      ship.cargo.quantity -= n
      record(state, `Transferred ${n} crates of ${GOODS[ship.cargo.good].name.toLowerCase()} from the prize to the Wayfarer.`)
      return true
    }
    case 'acceptBuyerOrder':
    case 'cancelBuyerOrder':
    case 'pickupBuyerOrder':
    case 'deliverBuyerOrder':
      return applyBuyerCommand(state, action)
    case 'buy':
    case 'sell':
      return trade(state, action)
    case 'chooseHarvest': {
      const lot = harvestLot(state)
      if (state.port !== 'copperfall' || !state.garden || !lot || lot.day !== action.day || lot.decision) return false
      const cost = lot.quantity * lot.rate
      if (action.decision === 'buy') {
        if (state.coins < cost || cargoUsed(state) + lot.quantity > state.ship.hold) return false
        state.coins -= cost
        addCargo(state.cargo.provisions, lot.quantity, cost)
        state.garden.lastLot = { day: lot.day, decision: 'bought' }
        record(state, `Bought Fen’s picking of ${lot.quantity} crates of winter pears for ${cost} crowns. The purser entered them as provisions.`)
      } else if (action.decision === 'pass') {
        state.garden.lastLot = { day: lot.day, decision: 'passed' }
        record(state, 'Passed on the winter pears. Fen waved the kitchen porter over for this picking.')
      } else return false
      return true
    }
    case 'fillCityOrder': {
      const order = cityOrder(state)
      if (!order.ready) return false
      const cost = releaseCargo(state.cargo[order.good], order.quantity)
      state.exchange = currentExchange(state)
      state.exchange.orders.push(state.port)
      witnessCityOrder(state, state.port)
      state.coins += order.pay
      creditMission(state)
      experience(state, 6)
      const gardenReceipt = state.port === 'copperfall' ? gardenWorkReceipt(state, `garden-civic-${exchangeCycle(state.day)}`, order.name) : ''
      record(state, `Filled “${order.name}” for ${order.pay} crowns. Cargo cost ${cost} crowns. The receipt bears the seal of the ${CITY_ECONOMY[state.port].institution}.` + gardenReceipt)
      return true
    }
    case 'useCityService': {
      if (!cityService(state)?.ready) return false
      state.exchange = currentExchange(state)
      state.exchange.services.push(state.port)
      if (state.port === 'glasshouse') {
        const inputCost = releaseCargo(state.cargo.glass, 2)
        state.coins -= 8
        addCargo(state.cargo.prisms, 1, inputCost + 8)
        record(state, 'The choir packed one annealed prism blank in your hold. The glass and rack fee are entered in its cost.')
      } else {
        state.coins -= 6
        for (const port of PORT_IDS) rememberMarket(state, port)
        record(state, 'Your chart now holds today’s prices and available lots from every exchange.')
      }
      return true
    }
    case 'acceptMission':
      if (state.port !== BEACON_COMMISSION.home || state.mission !== 'offered') return false
      state.mission = 'accepted'
      record(
        state,
        'Accepted Vale’s commission. Visit Keeper Iona at Glasshouse Reach to relight the Skyway Beacon.',
      )
      return true
    case 'presentCommission':
      if (state.port !== BEACON_COMMISSION.keeperPort || state.mission !== 'accepted') return false
      state.mission = 'invoice'
      record(state, `Iona opens Vale’s dispatch. The lens costs ${INVOICE_COST} crowns. The Compact repays it with a ${BEACON_COMMISSION.premium}-crown premium at Meridian.`)
      return true
    case 'deliverCertificate':
      if (state.port !== BEACON_COMMISSION.opens || state.certificate !== 'aboard') return false
      state.certificate = 'paid'
      state.coins += INVOICE_COST + BEACON_COMMISSION.premium
      record(state, `Pilot Sen countersigned the light. Received ${INVOICE_COST + BEACON_COMMISSION.premium} crowns from the beacon toll fund.`)
      return true
    case 'payInvoice':
      if (state.port !== BEACON_COMMISSION.keeperPort || state.mission !== 'invoice' || state.coins < INVOICE_COST)
        return false
      state.coins -= INVOICE_COST
      state.mission = 'lit'
      creditMission(state)
      state.buyers.seed = Math.floor(Math.random() * 65536)
      state.certificate = 'aboard'
      state.level = charterLevel
      state.xp += BEACON_COMMISSION.xp
      state.notoriety += BEACON_COMMISSION.notoriety
      record(
        state,
        `Paid the lens invoice. The Skyway Beacon shines again. Reached level ${state.level}, gained a captain ability, and opened ${PORTS[BEACON_COMMISSION.opens].name}. Bring Iona’s certificate to Pilot Sen for repayment.`,
      )
      return true
    case 'practiceDrill':
      state.drill = 'briefing'
      state.notice = ''
      return true
    case 'sail':
      if (action.to === state.port || !isUnlocked(state, action.to)) return false
      state.voyageCount += 1
      state.day += routeDays(state.port, action.to)
      if (state.voyageCount === 1 && state.port === 'sunstep') state.drill = 'briefing'
      state.voyage = { id: state.voyageCount, from: state.port, to: action.to, phase: 'underway' }
      if (passageEvent(state.voyageCount, state.tender) === 'raider') {
        state.voyage.pirate = rollPirate(state.pirateSeed, state.voyageCount, appraise(state).exposedValue)
      }
      state.notice = 'Underway for ' + PORTS[action.to].name + '.'
      return true
    case 'takeFreight': {
      const offer = freightOffer(state)
      if (!offer) return false
      state.freight = { ...offer, from: state.port }
      if (offer.special) state.specialFreightTaken = true
      record(
        state,
        'Signed for ' +
          (offer.special ? 'Neri’s cargo' : 'bonded mail') +
          ' to ' +
          PORTS[offer.to].name +
          ' for ' +
          offer.pay +
          ' crowns. The dispatch travels in the ship’s mail locker.',
      )
      return true
    }
    case 'upgrade': {
      if (!UPGRADE_IDS.includes(action.upgrade)) return false
      const offer = upgradeOffer(state, action.upgrade)
      if (!offer.available || state.coins < offer.cost) return false
      state.coins -= offer.cost
      const ship = state.ship
      switch (action.upgrade) {
        case 'hold':
          ship.hold += 4
          break
        case 'hull':
          ship.maxHull += 25
          ship.hull += 25
          break
        case 'guns':
          ship.guns += 1
          ship.cannons = Math.min(GUN_POSITIONS.length, ship.cannons + 1)
          break
        case 'crew':
          ship.crew += 2
          break
        case 'veteran':
          ship.crew += 1
          ship.veterans += 1
          break
        case 'repair':
          ship.hull = ship.maxHull
          break
      }
      record(state, offer.name + ' at ' + PORTS[state.port].name + ' for ' + offer.cost + ' crowns.')
      return true
    }
    case 'chooseAbility':
      if (!canLearnPerk(state,action.ability)) return false
      if (state.ability) state.command.perks.push(action.ability)
      else {
        if (!ABILITY_IDS.includes(action.ability as AbilityId)) return false
        state.ability = action.ability as AbilityId
      }
      rememberMarket(state)
      record(state, 'Learned ' + CAPTAIN_PERKS[action.ability].name + '.')
      return true
    default:
      return false
  }
}

export function advanceDrill(state: GameState, stage: DrillStage): GameState {
  if (state.drill === null || nextStage(state.drill) !== stage) return state
  return { ...state, drill: stage }
}

export function act(state: GameState, command: Command): GameState {
  const next = structuredClone(state)
  if (command.type === 'visitNpc' || command.type === 'rememberNpc') return changeContact(next, command) ? next : state
  if (state.drill) {
    if (command.type !== 'endDrill' || (!command.skip && state.drill !== 'debrief')) return state
    next.drill = null
    next.notice = ''
    if (!command.skip && state.voyage) {
      record(next, 'Cleared the Harbor Watch exercise. The Wayfarer can continue her passage.')
      next.pendingNotices.push(next.notice)
    }
    return next
  }
  const changed = state.voyage ? applyVoyageCommand(next, command) : applyDockCommand(next, command)
  if (!changed) return state
  if (next.notice) next.pendingNotices.push(next.notice)
  if (state.day !== next.day) {
    for (const notice of expireBuyerOrders(next)) {
      record(next, notice)
      next.pendingNotices.push(notice)
    }
  }
  reconcileBuyerCargo(next)
  return next
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function integer(value: unknown, min = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min
}

function isPort(value: unknown): value is PortId {
  return PORT_IDS.includes(value as PortId)
}

function validQuote(value: unknown): value is Quote {
  return object(value) && integer(value.buy, 1) && integer(value.sell, 1) && value.sell < value.buy
}

function validVisit(value: unknown): value is MarketVisit {
  if (!object(value) || !integer(value.day, 1) || !object(value.prices)) return false
  const prices = value.prices
  return ['provisions', 'glass', 'machinery'].every(good => validQuote(prices[good]))
    && Object.entries(prices).every(([good, quote]) => GOOD_IDS.includes(good as GoodId) && validQuote(quote))
    && (value.stock === undefined || validCounts(value.stock))
}

function validCounts(value: unknown): boolean {
  return object(value) && Object.entries(value).every(([key, number]) => GOOD_IDS.includes(key as GoodId) && integer(number))
}

function validExchange(value: unknown, day: number): boolean {
  if (!object(value) || !integer(value.cycle) || value.cycle > exchangeCycle(day) || !object(value.purchases)) return false
  const ports = (list: unknown) => Array.isArray(list) && list.every(isPort) && new Set(list).size === list.length
  return ports(value.orders) && ports(value.services) &&
    Object.entries(value.purchases).every(([port, counts]) => isPort(port) && validCounts(counts))
}

function validVoyage(value: unknown, currentPort: unknown, voyageCount: unknown): boolean {
  return (
    value === null ||
    (object(value) &&
      integer(value.id, 1) &&
      value.id === voyageCount &&
      value.from === currentPort &&
      isPort(value.to) &&
      value.from !== value.to &&
      typeof value.phase === 'string' &&
      ['underway', 'tender', 'raider', 'battle', 'prize'].includes(value.phase) &&
      (value.battle === undefined || (value.phase === 'battle' && validCombatCheckpoint(value.battle))) &&
      (value.phase === 'prize'
        ? object(value.pirate) && validPrizeTerms(value.prize, RAIDER_PROFILES.find(p => p.id === (value.pirate as PirateTerms).opponent))
        : value.prize === undefined))
  )
}

function validFreight(value: unknown): boolean {
  return (
    value === null ||
    (object(value) &&
      isPort(value.from) &&
      isPort(value.to) &&
      value.from !== value.to &&
      integer(value.pay, 1) &&
      typeof value.special === 'boolean')
  )
}

function validShip(value: unknown): value is Ship {
  return (
    object(value) &&
    integer(value.hold, 1) &&
    integer(value.hull, 1) &&
    integer(value.maxHull, value.hull) &&
    integer(value.guns) &&
    integer(value.cannons, 1) &&
    value.cannons <= GUN_POSITIONS.length &&
    integer(value.crew, 1) &&
    integer(value.veterans) &&
    value.veterans <= value.crew
  )
}

function validSave(value: unknown): value is GameState {
  if (
    !object(value) ||
    value.version !== 1 ||
    !integer(value.pirateSeed) || value.pirateSeed > 0xffffffff ||
    !isPort(value.port) ||
    !(value.drill === null || DRILL_STAGES.includes(value.drill as DrillStage)) ||
    (value.drill !== null &&
      value.voyage !== null &&
      !(
        object(value.voyage) &&
        value.voyage.id === 1 &&
        value.voyage.from === 'sunstep' &&
        value.voyage.phase === 'underway'
      )) ||
    !integer(value.day, 1) ||
    !integer(value.coins) ||
    !integer(value.xp) ||
    !integer(value.tradeProfitRemainder) ||
    value.tradeProfitRemainder >= TRADE_PROFIT_PER_XP ||
    !integer(value.notoriety) ||
    !integer(value.voyageCount) ||
    (!integer(value.level,1) || value.level > LAST_CAPTAIN_LEVEL ||
      value.level > charterLevel && value.xp < (value.level - 1) * CAPTAIN_XP_PER_LEVEL) ||
    !(value.ability === null || ABILITY_IDS.includes(value.ability as AbilityId)) ||
    !['new', 'arrived', 'briefed'].includes(String(value.firstWatch)) ||
    typeof value.mission !== 'string' ||
    !['offered', 'accepted', 'invoice', 'lit'].includes(value.mission) ||
    !(value.mission === 'lit' ? value.certificate === 'aboard' || value.certificate === 'paid' : value.certificate === 'none') ||
    typeof value.tender !== 'string' ||
    !['unseen', 'helped', 'passed'].includes(value.tender) ||
    typeof value.specialFreightTaken !== 'boolean' ||
    typeof value.notice !== 'string' ||
    !Array.isArray(value.pendingNotices) ||
    !value.pendingNotices.every((n) => typeof n === 'string') ||
    !Array.isArray(value.log)
  )
    return false
  // A restored chapter must still have a path to its remaining actions and rewards.
  if (
    (value.level >= charterLevel) !== (value.mission === 'lit') ||
    (value.level === 1 &&
      (value.ability !== null ||
        value.level < PORTS[value.port].requiredLevel ||
        (object(value.voyage) &&
          isPort(value.voyage.to) &&
          value.level < PORTS[value.voyage.to].requiredLevel))) ||
    (value.specialFreightTaken && value.tender !== 'helped')
  )
    return false
  if (!value.log.every((entry) => object(entry) && integer(entry.day, 1) && typeof entry.text === 'string'))
    return false
  if (!validVoyage(value.voyage, value.port, value.voyageCount) || !validFreight(value.freight)) return false
  if (!validContacts(value.contacts, value.day)) return false
  if (!validExchange(value.exchange, value.day)) return false
  if (!validShip(value.ship) || !object(value.cargo) || !object(value.pricesSeen)) return false
  const cargo = value.cargo
  let quantity = 0
  for (const good of GOOD_IDS) {
    const lot = cargo[good]
    if (!object(lot) || !integer(lot.quantity) || !integer(lot.cost) || (lot.quantity === 0 && lot.cost !== 0))
      return false
    if (lot.basis !== undefined) {
      const basis = lot.basis
      if (!object(basis) || !integer(basis.quantity, Math.max(1, lot.quantity)) || !integer(basis.cost)) return false
      if (remainingCargoCost({ quantity: basis.quantity, cost: basis.cost }, lot.quantity) !== lot.cost) return false
    }
    quantity += lot.quantity
  }
  return (
    validRegister(value.command, value.voyageCount, value.ability as AbilityId | null, value.level) &&
    !(object(value.voyage) && value.command.prizes.some(ship => ship.id === value.voyageCount)) &&
    validGarden(value.garden, value.day) &&
    validBuyerLedger(value.buyers, cargo as Record<GoodId, CargoLot>, value.day) &&
    quantity <= value.ship.hold &&
    validVisit(value.pricesSeen[value.port]) &&
    Object.entries(value.pricesSeen).every(([key, snapshot]) => isPort(key) && validVisit(snapshot))
  )
}

export function saveGame(state: GameState, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? globalThis.localStorage
    target.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadGame(storage?: Pick<Storage, 'getItem'>): GameState {
  try {
    const serialized = (storage ?? globalThis.localStorage).getItem(SAVE_KEY)
    if (serialized) {
      const value: unknown = JSON.parse(serialized)
      if (object(value) && value.version === 1) {
        if (value.tradeProfitRemainder === undefined) value.tradeProfitRemainder = 0
        if (value.pirateSeed === undefined) value.pirateSeed = legacyPirateSeed(serialized)
        if (value.command === undefined) value.command = newRegister()
        if (value.buyers === undefined) value.buyers = { seed: 0, orders: [] }
        if (value.garden === undefined) {
          const repaired = object(value.buyers) && Array.isArray(value.buyers.orders) &&
            value.buyers.orders.some(order => object(order) && order.id === 'fen-first-panes' &&
              order.status === 'filled' && order.delivered === 4 && order.quantity === 4)
          const receipt = repaired && Array.isArray(value.log) && value.log.find(entry => object(entry) &&
            integer(entry.day, 1) && entry.day <= 4 && typeof entry.text === 'string' &&
            entry.text.includes('Solar glass for Fen Alder at 26 crowns each.') && entry.text.includes('Order filled.'))
          value.garden = repaired ? { repairedDay: receipt ? receipt.day : value.day, jobs: [], lastLot: null } : null
        }
        if (value.firstWatch === undefined) value.firstWatch = 'briefed'
        if (value.pendingNotices === undefined) value.pendingNotices = []
        if (value.certificate === undefined) value.certificate = value.mission === 'lit' ? 'aboard' : 'none'
        if (value.drill === undefined) value.drill = null
        if (value.exchange === undefined && integer(value.day, 1) && object(value.cargo)) {
          value.exchange = freshExchange(value.day)
          for (const good of ['grafts', 'prisms', 'governors', 'soundings']) {
            if (value.cargo[good] === undefined) value.cargo[good] = { quantity: 0, cost: 0 }
          }
        }
        if (object(value.ship) && value.ship.cannons === undefined) {
          value.ship.cannons = value.voyageCount === 0 && value.ship.guns === 0 ? 1 : 4
        }
      }
      const legacyContacts = object(value) && value.version === 1 && value.contacts === undefined
      if (legacyContacts) value.contacts = {}
      if (validSave(value)) {
        const leg = value.voyage
        if (leg) {
          const wealth = appraise(value).exposedValue
          if (leg.pirate !== undefined) {
            if (!validPirateTerms(leg.pirate, wealth)) return initialState()
          } else if (leg.phase === 'raider' || leg.phase === 'battle') {
            // A returning captain may have already seen the previous release's quote.
            leg.pirate = legacyPirateTerms(wealth)
          } else if (leg.phase === 'underway' && passageEvent(leg.id, value.tender) === 'raider') {
            leg.pirate = rollPirate(value.pirateSeed, leg.id, wealth)
          }
        }
        if (legacyContacts) for (const port of value.exchange.orders) witnessCityOrder(value, port)
        return value
      }
    }
  } catch {
    // Storage can be unavailable in private browsing or when an earlier write was interrupted.
  }
  return initialState()
}
