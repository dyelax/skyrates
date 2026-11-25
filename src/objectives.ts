import { BEACON_COMMISSION, INVOICE_COST, PORTS, type GameState, type PortId } from './model'

export interface Objective {
  title: string
  detail: string
  destination: PortId
  offered?: boolean
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
  if (state.freight) jobs.push({ title: state.freight.special ? 'Neri’s consignment' : 'Bonded freight', destination: state.freight.to,
    detail: `Deliver to ${PORTS[state.freight.to].name}. Collect ${state.freight.pay} crowns on arrival.` })
  return jobs
}
