import { GOODS, GOOD_IDS, PORTS, type GoodId, type PortId } from './data'
import type { GameState } from './model'

export interface RaiderProfile {
  id: 'scout' | 'cutter' | 'corsair'
  name: string
  minWealth: number
  cannons: number
  hull: number
  crew: number
}

export const RAIDER_PROFILES: readonly RaiderProfile[] = [
  { id: 'scout', name: 'Scout', minWealth: 0, cannons: 1, hull: 62, crew: 5 },
  { id: 'cutter', name: 'Cutter', minWealth: 140, cannons: 2, hull: 82, crew: 8.3 },
  { id: 'corsair', name: 'Corsair', minWealth: 320, cannons: 4, hull: 110, crew: 13 },
]

export interface TollSettlement {
  cargo: { good: GoodId; quantity: number }[]
  coins: number
  change: number
}

export interface RaiderToll {
  exposedValue: number
  cargoValue: number
  profile: RaiderProfile
  crowns: number
  settlement: TollSettlement
}

export const MINIMUM_RAIDER_TOLL = 5

// Raiders use home-port list prices. Seasonal prices, paid cost and the broker
// ability cannot change an existing demand. Papers and mail occupy separate lockers.
const cargoHome: Record<GoodId, PortId> = {
  provisions: 'sunstep', glass: 'glasshouse', machinery: 'copperfall', grafts: 'sunstep',
  prisms: 'glasshouse', governors: 'copperfall', soundings: 'meridian',
}
const ratedGoods = GOOD_IDS.map(good => ({ good, value: PORTS[cargoHome[good]].prices[good] }))
  .sort((a, b) => b.value - a.value)

export function raiderToll(state: Pick<GameState, 'cargo' | 'coins'>): RaiderToll {
  const cargoValue = ratedGoods.reduce((sum, { good, value }) => sum + state.cargo[good].quantity * value, 0)
  const exposedValue = state.coins + cargoValue
  let profile = RAIDER_PROFILES[0]
  for (const candidate of RAIDER_PROFILES) {
    if (exposedValue >= candidate.minWealth) profile = candidate
  }
  const crowns = Math.max(MINIMUM_RAIDER_TOLL, Math.ceil(exposedValue / 20))
  let remaining = crowns
  const settlement: TollSettlement = { cargo: [], coins: 0, change: 0 }
  for (const { good, value } of ratedGoods) {
    if (remaining <= 0) break
    const quantity = Math.min(state.cargo[good].quantity, Math.ceil(remaining / value))
    if (quantity === 0) continue
    settlement.cargo.push({ good, quantity })
    remaining -= quantity * value
  }
  if (remaining < 0) settlement.change = -remaining
  else settlement.coins = Math.min(state.coins, remaining)
  return { exposedValue, cargoValue, profile, crowns, settlement }
}

export function tollSettlementLabel(settlement: TollSettlement): string {
  const parts = settlement.cargo.map(({ good, quantity }) =>
    `${quantity} ${quantity === 1 ? 'crate' : 'crates'} of ${GOODS[good].name.toLowerCase()}`)
  if (settlement.coins || !parts.length) parts.push(settlement.coins + (settlement.coins === 1 ? ' crown' : ' crowns'))
  const tender = parts.join(' + ')
  return settlement.change ? tender + ` (receive ${settlement.change} ${settlement.change === 1 ? 'crown' : 'crowns'} in change)` : tender
}

export function seizureLabel(state: Pick<GameState, 'cargo' | 'coins'>): string {
  return tollSettlementLabel(raiderToll(state).settlement)
}
