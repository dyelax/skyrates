export type PortId = 'sunstep' | 'glasshouse' | 'copperfall' | 'meridian'
export type GoodId = 'provisions' | 'glass' | 'machinery'
export type AbilityId = 'broker' | 'gunner' | 'leader'
export type UpgradeId = 'hold' | 'hull' | 'guns' | 'crew' | 'veteran' | 'repair'

interface Port {
  name: string
  subtitle: string
  description: string
  specialty: GoodId
  keeper: string
  requiredLevel: number
  mailTo: PortId
  daysTo: Record<PortId, number>
  prices: Record<GoodId, number>
}

export const PORTS: Record<PortId, Port> = {
  sunstep: {
    name: 'Sunstep Quay',
    subtitle: 'Agricultural skyport',
    description:
      'Orchards climb the mooring towers. Crates of pears ride the same cables down to market that carry engine parts back up.',
    keeper: 'Harbormaster Vale',
    requiredLevel: 1,
    mailTo: 'glasshouse',
    daysTo: { sunstep: 0, glasshouse: 1, copperfall: 2, meridian: 3 },
    specialty: 'provisions',
    prices: { provisions: 5, glass: 19, machinery: 32 },
  },
  glasshouse: {
    name: 'Glasshouse Reach',
    subtitle: 'Beacon station',
    description:
      'Violet furnaces burn beneath acres of glass. Beyond the terraces, the Skyway Beacon stands dark above the cloud sea.',
    keeper: 'Keeper Iona',
    requiredLevel: 1,
    mailTo: 'copperfall',
    daysTo: { sunstep: 1, glasshouse: 0, copperfall: 1, meridian: 2 },
    specialty: 'glass',
    prices: { provisions: 14, glass: 11, machinery: 25 },
  },
  copperfall: {
    name: 'Copperfall Yard',
    subtitle: 'Industrial skyport',
    description:
      'Copper cranes swing half-built keels over the mist. The yard crews are fitting their new winter gardens with glazing.',
    keeper: 'Yardmaster Orr',
    requiredLevel: 1,
    mailTo: 'sunstep',
    daysTo: { sunstep: 2, glasshouse: 1, copperfall: 0, meridian: 3 },
    specialty: 'machinery',
    prices: { provisions: 11, glass: 24, machinery: 16 },
  },
  meridian: {
    name: 'Meridian Spire',
    subtitle: 'Outer skyways',
    description:
      'Beyond the beacon, chart balloons launch from a white spire. The weather crews pay handsomely for provisions.',
    keeper: 'Pilot Sen',
    requiredLevel: 2,
    mailTo: 'glasshouse',
    daysTo: { sunstep: 3, glasshouse: 2, copperfall: 3, meridian: 0 },
    specialty: 'glass',
    prices: { provisions: 19, glass: 15, machinery: 29 },
  },
}

export const GOODS: Record<GoodId, { name: string; description: string }> = {
  provisions: { name: 'Provisions', description: 'Orchard fruit and grain, packed for the skyways.' },
  glass: { name: 'Solar glass', description: 'Cut panes that gather sunlight for gardens and sails.' },
  machinery: { name: 'Machinery', description: 'Brass gearsets and governors for working keels.' },
}

export const ABILITIES: Record<AbilityId, { name: string; description: string }> = {
  broker: { name: 'Silver Tongue', description: 'Pay 10% less when buying cargo.' },
  gunner: { name: 'Quick Gunnery', description: 'Your cannon crews reload faster.' },
  leader: { name: 'Boarding Captain', description: 'Your crew fights 25% more effectively when boarding.' },
}

export const BEACON_COMMISSION = {
  home: 'sunstep',
  keeperPort: 'glasshouse',
  opens: 'meridian',
  startingCoins: 78,
  invoiceCost: 240,
  xp: 100,
  notoriety: 3,
} as const

export const ENCOUNTERS = { safeOpeningVoyages: 1, tenderFromVoyage: 2, raiderInterval: 3 }
export const TENDER_DEED = {
  towDays: 1,
  notoriety: 1,
  xp: 10,
  contract: { from: 'copperfall', to: 'sunstep', pay: 85, xp: 12 },
} as const
export const BONDED_MAIL = { basePay: 14, payPerDay: 4, xp: 3 }

export const INVOICE_COST = BEACON_COMMISSION.invoiceCost
export const GOOD_IDS: GoodId[] = ['provisions', 'glass', 'machinery']
export const PORT_IDS: PortId[] = ['sunstep', 'glasshouse', 'copperfall', 'meridian']
export const ABILITY_IDS: AbilityId[] = ['broker', 'gunner', 'leader']
export const UPGRADE_IDS: UpgradeId[] = ['hold', 'hull', 'guns', 'crew', 'veteran', 'repair']
