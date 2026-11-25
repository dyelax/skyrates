import { DRILL_STAGES, nextStage, type DrillStage } from './drill'
import {
  ABILITIES,
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
export * from './data'

export interface Quote {
  buy: number
  sell: number
}
export interface CargoLot {
  quantity: number
  cost: number
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
  phase: 'underway' | 'tender' | 'raider' | 'battle'
}
export interface GameState {
  version: 1
  port: PortId
  day: number
  coins: number
  cargo: Record<GoodId, CargoLot>
  ship: Ship
  level: number
  xp: number
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
  pricesSeen: Partial<Record<PortId, MarketVisit>>
  freight: Freight | null
  log: { day: number; text: string }[]
  notice: string
  pendingNotices: string[]
}

export type BattleResult = 'won' | 'boarded' | 'escaped' | 'lost'
export type Command =
  | { type: 'acceptMission' | 'presentCommission' | 'deliverCertificate' | 'payInvoice' | 'continueVoyage' | 'engage' | 'evade' | 'takeFreight' | 'practiceDrill' | 'fillCityOrder' | 'useCityService' }
  | { type: 'endDrill'; skip: boolean }
  | { type: 'buy' | 'sell'; good: GoodId; quantity: number }
  | { type: 'sail'; to: PortId }
  | { type: 'tender'; help: boolean }
  | { type: 'resolveBattle'; id: number; result: BattleResult; hull: number }
  | { type: 'upgrade'; upgrade: UpgradeId }
  | { type: 'chooseAbility'; ability: AbilityId }
export type GameCommand = Command

export interface UpgradeOffer {
  name: string
  description: string
  cost: number
  available: boolean
}
export const SAVE_KEY = 'skyrates.save.v1'
const charterLevel = PORTS[BEACON_COMMISSION.opens].requiredLevel

export function initialState(): GameState {
  const state: GameState = {
    version: 1,
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
    ship: { hold: 12, hull: 100, maxHull: 100, guns: 0, cannons: 1, crew: 6, veterans: 1 },
    level: 1,
    xp: 0,
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
  const price = PORTS[port].prices[good] + cycle - 1
  const wholesale = Math.floor(price * 0.9)
  const sell = Math.max(1, Math.min(price - 2, wholesale - 1))
  const buy = state.ability === 'broker' ? wholesale : price
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
  return (state.ship.crew + 1.5 * state.ship.veterans) * (state.ability === 'leader' ? 1.25 : 1)
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
        name: ship.cannons < 4 ? 'Fit another cannon' : 'Cannon refit',
        description:
          ship.cannons < 4
            ? [
                '',
                'Add a starboard bow gun.',
                'Fit a second port gun for a broadside.',
                'Fit a second starboard gun for a broadside.',
              ][ship.cannons]
            : 'Improve power and reload speed on all four guns.',
        cost: 70 + 40 * ship.guns,
        available: ship.guns < 3,
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
  state.xp = Math.min(state.level === 1 ? 90 : 199, state.xp + amount)
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

function releaseCargo(lot: CargoLot, quantity: number) {
  const cost = Math.round((lot.cost * quantity) / lot.quantity)
  lot.quantity -= quantity
  lot.cost -= cost
  return cost
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
    lot.quantity += quantity
    lot.cost += total
    record(state, 'Bought ' + quantity + ' ' + GOODS[good].name.toLowerCase() + ' for ' + total + ' crowns.')
  } else {
    if (quantity > lot.quantity) return false
    const total = quantity * quote.sell
    const cost = releaseCargo(lot, quantity)
    state.coins += total
    const profit = total - cost
    if (profit > 0) experience(state, Math.min(6, profit))
    const result = profit === 0 ? 'Broke even.' : `${Math.abs(profit)}-crown ${profit > 0 ? 'profit' : 'loss'}.`
    record(state, `Sold ${quantity} ${GOODS[good].name.toLowerCase()} for ${total} crowns. ${result}`)
  }
  rememberMarket(state)
  return true
}

function applyVoyageCommand(state: GameState, action: Command): boolean {
  const voyage = state.voyage
  if (!voyage) return false
  switch (action.type) {
    case 'continueVoyage':
      if (voyage.phase !== 'underway') return false
      if (voyage.id <= ENCOUNTERS.safeOpeningVoyages) {
        arrive(state)
      } else if (state.tender === 'unseen' && voyage.id >= ENCOUNTERS.tenderFromVoyage) {
        voyage.phase = 'tender'
        state.notice = 'A tender hangs under a torn solar sail. Its skipper signals for a tow.'
      } else if (voyage.id % ENCOUNTERS.raiderInterval === 0) {
        voyage.phase = 'raider'
        state.notice = 'A raider crosses your wake. You have room to give her the slip.'
      } else {
        arrive(state)
      }
      return true
    case 'tender':
      if (voyage.phase !== 'tender') return false
      if (action.help) {
        state.tender = 'helped'
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
    case 'evade':
      if (voyage.phase !== 'raider') return false
      record(state, 'Evaded a raider among the cloud banks.')
      arrive(state, state.notice)
      return true
    case 'engage':
      if (voyage.phase !== 'raider') return false
      voyage.phase = 'battle'
      state.notice = 'Battle stations. The raider is closing.'
      return true
    case 'resolveBattle': {
      if (voyage.phase !== 'battle' || action.id !== voyage.id || !Number.isFinite(action.hull)) return false
      if (!['lost', 'won', 'boarded', 'escaped'].includes(action.result)) return false
      state.ship.hull = Math.min(state.ship.maxHull, Math.max(1, Math.round(action.hull)))
      if (action.result === 'lost') {
        state.ship.hull = Math.max(state.ship.hull, Math.ceil(state.ship.maxHull * 0.35))
        const ransom = Math.floor(state.coins * 0.2)
        state.coins -= ransom
        record(state, 'The raider took ' + ransom + ' crowns in ransom and let you limp into port.')
      } else if (action.result === 'escaped') {
        record(state, 'Broke contact with the raider and reached friendly skies.')
      } else {
        const prize = action.result === 'boarded' ? 40 : 25
        state.coins += prize
        state.notoriety += 1
        experience(state, 12)
        record(
          state,
          (action.result === 'boarded' ? 'The crew took the raider by boarding' : 'Drove off the raider') +
            ' and claimed ' +
            prize +
            ' crowns.',
        )
      }
      arrive(state, state.notice)
      return true
    }
    default:
      return false
  }
}

function applyDockCommand(state: GameState, action: Command): boolean {
  switch (action.type) {
    case 'buy':
    case 'sell':
      return trade(state, action)
    case 'fillCityOrder': {
      const order = cityOrder(state)
      if (!order.ready) return false
      const cost = releaseCargo(state.cargo[order.good], order.quantity)
      state.exchange = currentExchange(state)
      state.exchange.orders.push(state.port)
      state.coins += order.pay
      experience(state, 6)
      record(state, `Filled “${order.name}” for ${order.pay} crowns. Cargo cost ${cost} crowns. The receipt bears the seal of the ${CITY_ECONOMY[state.port].institution}.`)
      return true
    }
    case 'useCityService': {
      if (!cityService(state)?.ready) return false
      state.exchange = currentExchange(state)
      state.exchange.services.push(state.port)
      if (state.port === 'glasshouse') {
        const inputCost = releaseCargo(state.cargo.glass, 2)
        state.coins -= 8
        state.cargo.prisms.quantity++
        state.cargo.prisms.cost += inputCost + 8
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
          ship.cannons = Math.min(4, ship.cannons + 1)
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
      if (state.level < charterLevel || state.ability || !ABILITY_IDS.includes(action.ability)) return false
      state.ability = action.ability
      rememberMarket(state)
      record(state, 'Learned ' + ABILITIES[action.ability].name + '.')
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
      ['underway', 'tender', 'raider', 'battle'].includes(value.phase))
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
    value.cannons <= 4 &&
    integer(value.crew, 1) &&
    integer(value.veterans) &&
    value.veterans <= value.crew
  )
}

function validSave(value: unknown): value is GameState {
  if (
    !object(value) ||
    value.version !== 1 ||
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
    !integer(value.notoriety) ||
    !integer(value.voyageCount) ||
    (value.level !== 1 && value.level !== charterLevel) ||
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
    (value.level === charterLevel) !== (value.mission === 'lit') ||
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
  if (!validExchange(value.exchange, value.day)) return false
  if (!validShip(value.ship) || !object(value.cargo) || !object(value.pricesSeen)) return false
  const cargo = value.cargo
  let quantity = 0
  for (const good of GOOD_IDS) {
    const lot = cargo[good]
    if (!object(lot) || !integer(lot.quantity) || !integer(lot.cost) || (lot.quantity === 0 && lot.cost !== 0))
      return false
    quantity += lot.quantity
  }
  return (
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
      if (validSave(value)) return value
    }
  } catch {
    // Storage can be unavailable in private browsing or when an earlier write was interrupted.
  }
  return initialState()
}
