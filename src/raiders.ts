import { GOODS, GOOD_IDS, PORTS, type GoodId, type PortId } from './data'
import type { GameState } from './model'

export interface RaiderProfile {
  id: 'scout' | 'cutter' | 'corsair'
  name: string
  cannons: number
  hull: number
  crew: number
}

export const RAIDER_PROFILES: readonly RaiderProfile[] = [
  { id: 'scout', name: 'Scout', cannons: 1, hull: 62, crew: 5 },
  { id: 'cutter', name: 'Cutter', cannons: 2, hull: 82, crew: 8.3 },
  { id: 'corsair', name: 'Corsair', cannons: 4, hull: 110, crew: 13 },
]

// Each percentage within a band is equally likely. Promotion moves the pirate up one ship class.
export const LEVY_BANDS = [
  { min: 5, max: 12, chance: 65, promotion: 0 },
  { min: 13, max: 22, chance: 25, promotion: 10 },
  { min: 23, max: 35, chance: 8, promotion: 30 },
  { min: 36, max: 50, chance: 2, promotion: 65 },
] as const

// Base class weights, in scout / cutter / corsair order, before the levy promotion.
const PATROLS = [
  { from: 0, weights: [75, 23, 2] },
  { from: 140, weights: [44, 47, 9] },
  { from: 320, weights: [32, 45, 23] },
]

export interface PirateTerms {
  rate: number | null // An older, already-hailed save can have a fixed crown quote.
  crowns: number
  opponent: RaiderProfile['id']
}

export interface TollSettlement {
  cargo: { good: GoodId; quantity: number }[]
  coins: number
  change: number
}

type Manifest = Pick<GameState, 'coins' | 'cargo'>
type Encounter = Manifest & Pick<GameState, 'voyage'>

export interface RaiderToll {
  exposedValue: number
  cargoValue: number
  profile: RaiderProfile
  crowns: number
  rate: number | null
  settlement: TollSettlement
}

// Documents and bonded mail travel outside the commercial hold.
const cargoHome: Record<GoodId, PortId> = {
  provisions: 'sunstep', glass: 'glasshouse', machinery: 'copperfall', grafts: 'sunstep',
  prisms: 'glasshouse', governors: 'copperfall', soundings: 'meridian',
}
const ratedGoods = GOOD_IDS.map(good => ({ good, value: PORTS[cargoHome[good]].prices[good] }))
  .sort((a, b) => b.value - a.value)

export function appraise(state: Manifest) {
  const cargoValue = ratedGoods.reduce((sum, { good, value }) => sum + state.cargo[good].quantity * value, 0)
  return { exposedValue: state.coins + cargoValue, cargoValue }
}

function patrolFor(wealth: number) {
  for (let i = PATROLS.length - 1; i > 0; i--) {
    if (wealth >= PATROLS[i].from) return PATROLS[i]
  }
  return PATROLS[0]
}

function levy(wealth: number, rate: number) {
  // Round to the nearest whole crown inside the collectible 5–50% bounds.
  return Math.min(Math.floor(wealth / 2), Math.max(Math.ceil(wealth / 20), Math.round(wealth * rate / 100)))
}

export function raiderForecast(state: Manifest) {
  const appraisal = appraise(state)
  const { exposedValue } = appraisal
  const bands = LEVY_BANDS.map(band => ({ ...band, low: levy(exposedValue, band.min), high: levy(exposedValue, band.max) }))
  const weights = patrolFor(exposedValue).weights
  const promote = LEVY_BANDS.reduce((sum, b) => sum + b.chance * b.promotion / 10_000, 0)
  const ships = RAIDER_PROFILES.map((profile, i) => {
    const retained = weights[i] * (i === weights.length - 1 ? 1 : 1 - promote)
    const promoted = i === 0 ? 0 : weights[i - 1] * promote
    return { profile, chance: retained + promoted }
  })
  return { ...appraisal, bands, ships, low: bands[0].low, high: bands[bands.length - 1].high }
}

export function forecastText(forecast: ReturnType<typeof raiderForecast>): string {
  if (forecast.exposedValue < 2) return 'The raiders cannot collect a whole crown from this manifest. They will let you pass.'
  const common = forecast.bands[0], rare = forecast.bands[forecast.bands.length - 1]
  const range = (low: number, high: number) => low === high ? String(low) : low + '–' + high
  const commonShip = forecast.ships.reduce((a, b) => a.chance >= b.chance ? a : b)
  const corsairChance = Math.round(forecast.ships[2].chance)
  return `About ${common.chance}% of raiders ask ${range(common.low, common.high)} crowns. The steepest ${rare.chance}% ask ${range(rare.low, rare.high)} crowns. ` +
    `A ${commonShip.profile.name.toLowerCase()} is most likely. About ${corsairChance}% of hails come from four-gun corsairs.`
}

// A 32-bit integer mixer (MurmurHash3 finalizer). Separate counters keep the
// band, percentage, pirate class and promotion independent of UI/render order.
function mix(value: number): number {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  return (value ^ (value >>> 16)) >>> 0
}

export function legacyPirateSeed(serialized: string): number {
  let hash = 2166136261
  for (let i = 0; i < serialized.length; i++) hash = Math.imul(hash ^ serialized.charCodeAt(i), 16777619)
  return mix(hash)
}

function choose(weights: number[], roll: number): number {
  for (let i = 0; i < weights.length - 1; i++) {
    if (roll < weights[i]) return i
    roll -= weights[i]
  }
  return weights.length - 1
}

export function rollPirate(seed: number, voyage: number, wealth: number): PirateTerms {
  const key = mix(seed ^ mix(voyage))
  const draw = (counter: number) => mix(key + Math.imul(counter, 0x9e3779b9)) / 0x100000000
  const band = LEVY_BANDS[choose(LEVY_BANDS.map(b => b.chance), draw(1) * 100)]
  const rate = band.min + Math.floor(draw(2) * (1 + band.max - band.min))
  const base = choose(patrolFor(wealth).weights, draw(3) * 100)
  const rank = Math.min(RAIDER_PROFILES.length - 1, base + Number(draw(4) * 100 < band.promotion))
  return { rate, crowns: levy(wealth, rate), opponent: RAIDER_PROFILES[rank].id }
}

export function legacyPirateTerms(wealth: number): PirateTerms {
  const rank = PATROLS.indexOf(patrolFor(wealth))
  return { rate: null, crowns: Math.min(Math.floor(wealth / 2), Math.max(5, Math.ceil(wealth / 20))), opponent: RAIDER_PROFILES[rank].id }
}

export function validPirateTerms(value: unknown, wealth: number): boolean {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<PirateTerms>
  if (!RAIDER_PROFILES.some(p => p.id === t.opponent)) return false
  if (t.rate === null) {
    const old = legacyPirateTerms(wealth)
    return old.crowns === t.crowns && old.opponent === t.opponent
  }
  return typeof t.rate === 'number' && Number.isInteger(t.rate) && t.rate >= LEVY_BANDS[0].min &&
    t.rate <= LEVY_BANDS[LEVY_BANDS.length - 1].max && t.crowns === levy(wealth, t.rate)
}

export function raiderToll(state: Encounter): RaiderToll {
  const terms = state.voyage?.pirate
  if (!terms) throw new Error('Pirate terms have not been set for this voyage.')
  const profile = RAIDER_PROFILES.find(profile => profile.id === terms.opponent)!
  let remaining = terms.crowns
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
  return { ...appraise(state), profile, crowns: terms.crowns, rate: terms.rate, settlement }
}

export function tollSettlementLabel(settlement: TollSettlement): string {
  const parts = settlement.cargo.map(({ good, quantity }) =>
    `${quantity} ${quantity === 1 ? 'crate' : 'crates'} of ${GOODS[good].name.toLowerCase()}`)
  if (settlement.coins || !parts.length) parts.push(settlement.coins + (settlement.coins === 1 ? ' crown' : ' crowns'))
  const tender = parts.join(' + ')
  return settlement.change ? tender + ` (receive ${settlement.change} ${settlement.change === 1 ? 'crown' : 'crowns'} in change)` : tender
}

export function seizureLabel(state: Encounter): string {
  return tollSettlementLabel(raiderToll(state).settlement)
}
