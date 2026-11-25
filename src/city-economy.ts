import type { GoodId, PortId, UpgradeId } from './data'

export const EXCHANGE_DAYS = 3
export const exchangeCycle = (day: number) => Math.floor((day - 1) / EXCHANGE_DAYS)
export const nextPosting = (day: number) => (exchangeCycle(day) + 1) * EXCHANGE_DAYS + 1

interface CityEconomy {
  market: string
  yard: string
  institution: string
  district: string
  practice: string
  tradeLead: string
  stock: Partial<Record<GoodId, number>>
  upgrades: UpgradeId[]
  specialty: GoodId
  order: { good: GoodId; quantity: number; premium: number; name: string; need: string }
}

export const CITY_ECONOMY: Record<PortId, CityEconomy> = {
  sunstep: {
    market: 'Common Weighhouse',
    yard: 'Liftwrights’ Shed',
    institution: 'Grafting Arcade',
    district: 'Orchard Commons',
    practice:
      'A porter reads the public balance while a grower fits a new scion. Every terrace has a vote, and every weight can be challenged.',
    tradeLead:
      'Glasshouse furnace crews buy provisions. Copperfall’s winter garden pays for living pear grafts. Only Sunstep sells the nursery lots.',
    stock: { provisions: 42, machinery: 2, grafts: 3 },
    upgrades: ['hold', 'crew', 'repair'],
    specialty: 'grafts',
    order: {
      good: 'governors',
      quantity: 1,
      premium: 18,
      name: 'Repair the lift cage',
      need: 'The last freight cage shudders when a loaded cart goes on. The coop needs one matched spindle from Copperfall.',
    },
  },
  glasshouse: {
    market: 'Furnace Exchange',
    yard: 'Glassworkers’ Berth',
    institution: 'Annealing Tunnel',
    district: 'Furnace Choir',
    practice:
      'Three bells hand a batch from gatherer to annealer to reader. The reader turns every blank against a flame before it leaves the tunnel.',
    tradeLead:
      'Copperfall is glazing its winter gardens. The rarer prism blanks sell to Meridian’s weather pilots once the outer route opens.',
    stock: { provisions: 6, glass: 36, prisms: 2 },
    upgrades: ['crew', 'repair'],
    specialty: 'prisms',
    order: {
      good: 'soundings',
      quantity: 1,
      premium: 22,
      name: 'Time the furnace draw',
      need: 'Sudden pressure changes spoil a draw. The annealers want a recent sounding folio from Meridian.',
    },
  },
  copperfall: {
    market: 'Chain Market',
    yard: 'Keel Proof Slip',
    institution: 'Winter Garden',
    district: 'Chain Assembly',
    practice:
      'Pear saplings grow where a salvaged keel once stood. Each night shift sends one gardener, and each occupied slip sends a delegate to the chain.',
    tradeLead:
      'Sunstep imports machinery and matched spindles for its orchard lifts. The yard’s heavy plating and cannon refits are exclusive to its proof slip.',
    stock: { provisions: 9, machinery: 30, governors: 3 },
    upgrades: ['hull', 'guns', 'veteran', 'repair'],
    specialty: 'governors',
    order: {
      good: 'grafts',
      quantity: 2,
      premium: 28,
      name: 'Plant the night shift garden',
      need: 'Two shallow-rooted pear grafts from Sunstep will fill the beds under the new glass roof.',
    },
  },
  meridian: {
    market: 'Balloon Exchange',
    yard: 'Pilots’ Loft',
    institution: 'Sounding House',
    district: 'Outer Survey',
    practice:
      'A pilot and a winch keeper sign each observation together. Bolts of signal silk snap above a slate crowded with the morning returns.',
    tradeLead:
      'The outer crews pay handsomely for provisions. Sealed sounding folios from this desk earn their best return at the Glasshouse furnaces.',
    stock: { provisions: 4, glass: 4, soundings: 2 },
    upgrades: ['veteran', 'repair'],
    specialty: 'soundings',
    order: {
      good: 'prisms',
      quantity: 1,
      premium: 24,
      name: 'Replace a balloon optic',
      need: 'The sounding crews need one flaw-tested prism from Glasshouse for the returning balloon’s instrument.',
    },
  },
}

export const RARITY: Record<GoodId, string> = {
  provisions: 'Common',
  glass: 'Trade staple',
  machinery: 'Trade staple',
  grafts: 'Limited nursery lot',
  prisms: 'Rare optical lot',
  governors: 'Limited proof lot',
  soundings: 'Rare survey issue',
}

export function allotment(port: PortId, good: GoodId, day: number): number {
  const amount = CITY_ECONOMY[port].stock[good]
  if (!amount) return 0
  // Different release sizes across postings, while every signature export has an available opening route.
  return Math.max(1, amount - (exchangeCycle(day) % Math.min(3, amount)))
}
