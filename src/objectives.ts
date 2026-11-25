import { BEACON_COMMISSION, GOODS, INVOICE_COST, PORTS, harvestLot, harvestTerms, buyerLoadedQuantity, buyerOrders, type BuyerOffer, type GameState, type GoodId, type PortId } from './model'

export interface Objective {
  title: string
  detail: string
  destination: PortId
  offered?: boolean
  privilege?: boolean
  buyerId?: string
}

export function buyerQuantity(good: GoodId, quantity: number): string {
  if (good === 'glass') return `${quantity} solar glass ${quantity === 1 ? 'pane' : 'panes'}`
  return `${quantity} × ${GOODS[good].name}`
}

export function buyerTerms(offer: BuyerOffer & { delivered?: number }): string {
  const remaining = offer.quantity - (offer.delivered ?? 0)
  return `${buyerQuantity(offer.good, remaining)} needed · ${offer.rate} cr per ${offer.good === 'glass' ? 'pane' : 'crate'} · due day ${offer.dueDay}`
}

export function chartObjectives(state: GameState): Objective[] {
  const jobs: Objective[] = []
  if (state.mission !== 'lit') {
    const offered = state.mission === 'offered'
    const shortfall = Math.max(0, INVOICE_COST - state.coins)
    jobs.push({
      title: 'The Skyway Beacon', offered,
      destination: offered ? BEACON_COMMISSION.home : BEACON_COMMISSION.keeperPort,
      detail: offered ? 'Vale has a commission at the Sunstep port office.'
        : state.mission === 'accepted' ? 'Meet Keeper Iona in the lamp office at Glasshouse Reach.'
        : shortfall ? `Earn ${shortfall} more crowns for the lens. Return to Iona with ${INVOICE_COST}.`
        : 'Your purse covers the lens. Pay Keeper Iona at Glasshouse Reach.',
    })
  }
  if (state.certificate === 'aboard') jobs.push({
    title: 'The lightkeeper’s certificate', destination: BEACON_COMMISSION.opens,
    detail: `Have Pilot Sen countersign at Meridian Spire for ${INVOICE_COST + BEACON_COMMISSION.premium} crowns.`,
  })
  if (state.freight) jobs.push({ title: state.freight.special ? 'Neri’s consignment' : 'Bonded freight', destination: state.freight.to,
    detail: `Deliver to ${PORTS[state.freight.to].name}. Collect ${state.freight.pay} crowns on arrival.` })
  for (const order of buyerOrders(state)) {
    const left = order.quantity - order.delivered
    const loaded = buyerLoadedQuantity(state, order)
    const unload = loaded >= left || (state.port === order.destination && loaded > 0)
    jobs.push({
      title: order.title, buyerId: order.id, destination: unload ? order.destination : order.source,
      detail: `${order.buyer} at ${PORTS[order.destination].name} pays ${order.rate} crowns each through day ${order.dueDay}. ${buyerQuantity(order.good, left)} still due · ${loaded} aboard.` +
        (unload ? ' Hand in your cargo at the market counter.' : ` ${order.kind === 'delivery' ? 'Buy stamped cargo' : 'Find stock'} at ${PORTS[order.source].name}.`),
    })
  }
  const harvest = harvestLot(state)
  if (harvest && !harvest.decision) jobs.push({ title: 'First picking of winter pears', destination: 'copperfall', privilege: true, detail: harvestTerms(state) })
  return jobs
}
