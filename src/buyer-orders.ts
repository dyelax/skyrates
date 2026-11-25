import { allotment, EXCHANGE_DAYS, exchangeCycle } from './city-economy'
import { GOOD_IDS, PORTS, PORT_IDS, type GoodId, type PortId } from './data'
import { fenGardenOffer } from './winter-garden'
import { seasonalAdjustment } from './seasonal-trade'
import type { GameState } from './model'

export interface BuyerOffer {
  id: string
  kind: 'collection' | 'delivery'
  title: string
  buyer: string
  source: PortId
  destination: PortId
  good: GoodId
  quantity: number
  rate: number
  dueDay: number
}

export interface BuyerOrder extends BuyerOffer {
  status: 'signed' | 'filled' | 'released' | 'expired'
  delivered: number
  loaded: number // Stamped crates still aboard for this specific delivery.
}

export interface BuyerLedger {
  seed: number
  orders: BuyerOrder[]
}

export type BuyerCommand =
  | { type: 'acceptBuyerOrder' | 'cancelBuyerOrder'; id: string }
  | { type: 'deliverBuyerOrder'; id: string; delivered: number }
  | { type: 'pickupBuyerOrder'; id: string; delivered: number; loaded: number }

export const FEN_PANES: BuyerOffer = {
  id: 'fen-first-panes', kind: 'collection', title: 'Glaze the night-shift garden',
  buyer: 'Fen Alder', source: 'glasshouse', destination: 'copperfall', good: 'glass',
  quantity: 4, rate: 26, dueDay: 4,
}

type Request = Pick<BuyerOffer, 'title' | 'buyer' | 'source' | 'destination' | 'good'>
const requests: Request[] = [
  { title: 'Replace the orchard lift gears', buyer: 'Joss Hale', source: 'copperfall', destination: 'sunstep', good: 'machinery' },
  { title: 'Feed the balloon watch', buyer: 'Uma Tern', source: 'sunstep', destination: 'meridian', good: 'provisions' },
  { title: 'Record the next furnace draw', buyer: 'Tal Reed', source: 'meridian', destination: 'glasshouse', good: 'soundings' },
  { title: 'Replant the leeward beds', buyer: 'Fen Alder', source: 'sunstep', destination: 'copperfall', good: 'grafts' },
  { title: 'Fit the survey optics', buyer: 'Orin Mel', source: 'glasshouse', destination: 'meridian', good: 'prisms' },
  { title: 'Refit the terrace brakes', buyer: 'Nettle Arin', source: 'copperfall', destination: 'sunstep', good: 'governors' },
  { title: 'Patch the greenhouse roof', buyer: 'Fen Alder', source: 'glasshouse', destination: 'copperfall', good: 'glass' },
]

function exchangePosting(state: GameState, kind: BuyerOffer['kind']): BuyerOffer {
  const cycle = exchangeCycle(state.day)
  const start = cycle * EXCHANGE_DAYS + 1
  const offset = kind === 'delivery' ? 3 : 0
  const index = (state.buyers.seed + cycle + offset) % requests.length
  const need = requests[index]
  const supply = Math.min(8, allotment(need.source, need.good, start))
  const demand = Math.max(0, seasonalAdjustment(need.destination, need.good, start))
  const quantity = 1 + ((cycle + index + demand) % supply)
  const rate = PORTS[need.destination].prices[need.good] + demand + 4 + (cycle + offset) % 6
  // Even on the last posting day the captain can reach the supplier, then the buyer.
  const longestApproach = Math.max(...PORT_IDS.map(port => PORTS[port].daysTo[need.source]))
  const dueDay = start + EXCHANGE_DAYS - 1 + longestApproach + PORTS[need.source].daysTo[need.destination]
  const title = need.title === 'Patch the greenhouse roof' && state.garden ? 'Glaze the propagation frames' : need.title
  return { ...need, title, kind, id: `board-${cycle}-${kind}`, quantity, rate, dueDay }
}

export function buyerOffers(state: GameState): BuyerOffer[] {
  const offers = state.mission === 'lit'
    ? [exchangePosting(state, 'collection'), exchangePosting(state, 'delivery')]
    : state.day <= FEN_PANES.dueDay ? [FEN_PANES] : []
  const gardenJob = fenGardenOffer(state)
  if (gardenJob) offers.push(gardenJob)
  return offers.filter(offer => !state.buyers.orders.some(order => order.id === offer.id))
}

export function buyerOrders(state: GameState): BuyerOrder[] {
  return state.buyers.orders.filter(order => order.status === 'signed' && order.dueDay >= state.day)
}

export function stampedQuantity(state: GameState, good: GoodId): number {
  return buyerOrders(state).reduce((sum, order) => sum + (order.good === good ? order.loaded : 0), 0)
}

export function buyerLoadedQuantity(state: GameState, order: BuyerOrder): number {
  if (order.kind === 'delivery') return order.loaded
  return Math.min(order.quantity - order.delivered, state.cargo[order.good].quantity - stampedQuantity(state, order.good))
}

export function deliverableQuantity(state: GameState, id: string): number {
  const order = buyerOrders(state).find(ticket => ticket.id === id)
  return order && order.destination === state.port ? buyerLoadedQuantity(state, order) : 0
}

// Selling or losing stamped crates voids their stamps. Later purchases cannot
// stand in for them until the source clerk stamps a new pickup.
export function reconcileBuyerCargo(state: GameState): void {
  const allocated = new Map<GoodId, number>()
  for (const order of buyerOrders(state)) {
    if (!order.loaded) continue
    const earlier = allocated.get(order.good) ?? 0
    order.loaded = Math.min(order.loaded, Math.max(0, state.cargo[order.good].quantity - earlier))
    allocated.set(order.good, earlier + order.loaded)
  }
}

export function expireBuyerOrders(state: GameState): string[] {
  const notices: string[] = []
  for (const order of state.buyers.orders) {
    if (order.status === 'signed' && order.dueDay < state.day) {
      order.status = 'expired'
      order.loaded = 0
      notices.push(`${order.buyer}’s order closed after day ${order.dueDay}. Delivered ${order.delivered} of ${order.quantity}. Any cargo left aboard is yours to sell.`)
    }
  }
  // Retain Fen's first receipt for her dialogue. A closed rotating posting
  // only needs a receipt in this ledger while it can still be signed again.
  state.buyers.orders = state.buyers.orders.filter(order => order.status === 'signed' ||
    order.id === FEN_PANES.id || order.id.startsWith(`board-${exchangeCycle(state.day)}-`) || order.id.startsWith(`fen-garden-${exchangeCycle(state.day)}-`))
  return notices
}

export function firstPaneOrderOpen(state: GameState): boolean {
  return [...buyerOrders(state), ...buyerOffers(state)].some(ticket => ticket.id === FEN_PANES.id)
}

export function fenPaneDocket(state: GameState): string {
  const order = state.buyers.orders.find(ticket => ticket.id === FEN_PANES.id)
  const { quantity, rate, dueDay } = FEN_PANES
  if (order?.status === 'filled') return 'Fen has all four of your solar panes in the garden roof. The Chain Market paid the full 104 crowns.'
  if (order?.status === 'released') return 'You released Fen’s first pane order. The Chain Market has closed that ticket.'
  if (order?.status === 'expired' || state.day > dueDay || (!order && state.mission === 'lit'))
    return 'Fen’s first pane order is closed. You can still sell glass at the ordinary Chain Market price.'
  const left = quantity - (order?.delivered ?? 0)
  const action = order ? 'Your order is signed.' : 'Sign the posting on the sky chart or at an exchange.'
  return `Fen needs ${left} solar glass ${left === 1 ? 'pane' : 'panes'} for the night-shift garden. The Chain Market at Copperfall Yard pays ${rate} crowns per pane through day ${dueDay}. ${action} Hand them in at that counter.`
}

export function validBuyerLedger(value: unknown, cargo: Record<GoodId, { quantity: number }>, day: number): value is BuyerLedger {
  if (!value || typeof value !== 'object') return false
  const ledger = value as Partial<BuyerLedger>
  if (typeof ledger.seed !== 'number' || !Number.isSafeInteger(ledger.seed) || ledger.seed < 0 || ledger.seed > 65535 || !Array.isArray(ledger.orders)) return false
  const ids = new Set<string>()
  const stamped = new Map<GoodId, number>()
  return ledger.orders.every(order => {
    if (!order || typeof order !== 'object' || typeof order.id !== 'string' || ids.has(order.id) ||
      (order.id !== FEN_PANES.id && !/^(?:board-\d+-(?:collection|delivery)|fen-garden-\d+-(?:grafts|prisms|glass|repair))$/.test(order.id)) ||
      !['collection', 'delivery'].includes(order.kind) || !['signed', 'released', 'filled', 'expired'].includes(order.status) ||
      typeof order.title !== 'string' || typeof order.buyer !== 'string' ||
      !PORT_IDS.includes(order.source) || !PORT_IDS.includes(order.destination) || order.source === order.destination ||
      !GOOD_IDS.includes(order.good) || ![order.quantity, order.rate, order.dueDay].every(n => Number.isSafeInteger(n) && n > 0) ||
      ![order.loaded, order.delivered].every(n => Number.isSafeInteger(n) && n >= 0) ||
      order.delivered + order.loaded > order.quantity || (order.status === 'filled') !== (order.delivered === order.quantity) ||
      (order.status === 'signed' && order.dueDay < day) || (order.loaded && (order.kind !== 'delivery' || order.status !== 'signed'))) return false
    ids.add(order.id)
    const total = order.loaded + (stamped.get(order.good) ?? 0)
    stamped.set(order.good, total)
    return total <= cargo[order.good].quantity
  })
}
