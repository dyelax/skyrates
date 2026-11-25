import { EXCHANGE_DAYS, exchangeCycle } from './city-economy'
import type { BuyerOffer } from './buyer-orders'
import type { GameState } from './model'

const gardenWork = [
  { good: 'grafts', source: 'sunstep', title: 'Plant the espalier row', quantity: 1, rate: 33 },
  { good: 'prisms', source: 'glasshouse', title: 'Focus the winter grow lamps', quantity: 1, rate: 41 },
  { good: 'glass', source: 'glasshouse', title: 'Glaze the propagation frames', quantity: 2, rate: 29 },
] as const

export interface WinterGarden {
  repairedDay: number
  jobs: { id: string; title: string }[]
  lastLot: { day: number; decision: 'bought' | 'passed' } | null
}
export const HARVEST = { quantity: 2, rate: 8 } as const
export const FEN_CONFIDENCE_JOBS = gardenWork.length

export function fenGardenOffer(state: GameState): BuyerOffer | undefined {
  const cycle = exchangeCycle(state.day)
  const garden = state.garden
  if (!garden && state.mission !== 'lit') return
  if (state.buyers.orders.some(order => order.status === 'signed' && order.dueDay >= state.day &&
    (order.id === 'fen-first-panes' || order.id.startsWith('fen-garden-')))) return
  const common = { buyer: 'Fen Alder', destination: 'copperfall', kind: 'collection', dueDay: (cycle + 1) * EXCHANGE_DAYS + 5 } as const
  if (!garden) return {
    ...common, id: `fen-garden-${cycle}-repair`, source: 'glasshouse', good: 'glass', quantity: 4,
    rate: 26, title: 'Reglaze the night-shift garden',
  }
  if (garden.jobs.length >= FEN_CONFIDENCE_JOBS) return
  const outstanding = gardenWork.filter(job => !garden.jobs.some(receipt => receipt.title === job.title))
  if (!outstanding.length) return
  const need = outstanding[(state.buyers.seed + cycle) % outstanding.length]
  return { ...common, ...need, id: `fen-garden-${cycle}-${need.good}` }
}

export function gardenWorkReceipt(state: GameState, id: string, title: string): string {
  const garden = state.garden
  if (!garden || garden.jobs.length >= FEN_CONFIDENCE_JOBS || garden.jobs.some(receipt => receipt.id === id)) return ''
  garden.jobs.push({ id, title })
  if (garden.jobs.length === FEN_CONFIDENCE_JOBS)
    return ' Fen brushes the soil from both sleeves. “Come sit with me in the Winter Garden after the shift bell. There’s something I want to tell you.”'
  return ` Fen entered “${title}” in the garden ledger.`
}

export function harvestLot(state: GameState) {
  const garden = state.garden
  if (!garden) return
  const day = garden.repairedDay + Math.floor((state.day - garden.repairedDay) / EXCHANGE_DAYS) * EXCHANGE_DAYS
  return { ...HARVEST, day, through: day + EXCHANGE_DAYS - 1,
    decision: garden.lastLot?.day === day ? garden.lastLot.decision : null }
}

export function harvestTerms(state: GameState): string {
  const lot = harvestLot(state)
  if (!lot) return ''
  if (lot.decision === 'bought') return `You bought this picking. Fen’s next pears come in on day ${lot.through + 1}.`
  if (lot.decision === 'passed') return `The shift kitchens took this picking. Fen will offer you the next pears on day ${lot.through + 1}.`
  return `Fen is holding ${lot.quantity} crates of winter pears at ${lot.rate} crowns each through day ${lot.through}. Buy both at the Winter Garden counter in Copperfall Yard or pass them to the shift kitchens. The pears trade as provisions.`
}

export function validGarden(value: unknown, day: number): value is WinterGarden | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const g = value as Partial<WinterGarden>
  if (typeof g.repairedDay !== 'number' || !Number.isSafeInteger(g.repairedDay) || g.repairedDay < 1 || g.repairedDay > day ||
    !Array.isArray(g.jobs) || g.jobs.length > FEN_CONFIDENCE_JOBS ||
    !g.jobs.every(job => job && typeof job.id === 'string' && typeof job.title === 'string') ||
    new Set(g.jobs.map(job => job.id)).size !== g.jobs.length) return false
  const lot = g.lastLot
  return lot === null || (!!lot && Number.isSafeInteger(lot.day) && lot.day >= g.repairedDay && lot.day <= day &&
    (lot.day - g.repairedDay) % EXCHANGE_DAYS === 0 && ['bought', 'passed'].includes(lot.decision))
}
