import type { PortId, GoodId } from './data'
import { seasonAt, type Season } from './weather'

interface Posting {
  good: GoodId
  adjustment: number
  reason: string
}
const postings: Record<PortId, Record<Season, Posting[]>> = {
  sunstep: {
    spring: [
      {
        good: 'machinery',
        adjustment: 4,
        reason:
          'Spring rain floods the lowest terraces. Growers need pump gear.',
      },
    ],
    summer: [
      {
        good: 'glass',
        adjustment: 3,
        reason: 'Nurseries are expanding their shade roofs.',
      },
    ],
    autumn: [
      {
        good: 'provisions',
        adjustment: -2,
        reason: 'The pear harvest crowds the weighing floor.',
      },
      {
        good: 'governors',
        adjustment: 6,
        reason: 'Fruit cages run double shifts with their heaviest loads.',
      },
    ],
    winter: [
      {
        good: 'provisions',
        adjustment: 3,
        reason: 'Stored fruit is running low.',
      },
      {
        good: 'glass',
        adjustment: 5,
        reason: 'Cold nights threaten the nursery roofs.',
      },
    ],
  },
  glasshouse: {
    spring: [
      {
        good: 'soundings',
        adjustment: 5,
        reason: 'Rapid pressure changes threaten the furnace draw.',
      },
    ],
    summer: [
      {
        good: 'glass',
        adjustment: -2,
        reason: 'Long bright shifts send more solar panes to market.',
      },
    ],
    autumn: [
      {
        good: 'machinery',
        adjustment: 4,
        reason: 'Annealers service their furnace drives before the freeze.',
      },
    ],
    winter: [
      {
        good: 'provisions',
        adjustment: 6,
        reason: 'Overnight crews stay on the frost watch.',
      },
      {
        good: 'governors',
        adjustment: 5,
        reason: 'Furnace blowers need steady pressure through the inversion.',
      },
    ],
  },
  copperfall: {
    spring: [
      {
        good: 'grafts',
        adjustment: 3,
        reason: 'The night-shift garden has fresh planting beds.',
      },
    ],
    summer: [
      {
        good: 'provisions',
        adjustment: 4,
        reason: 'Heat dries the shallow beds in the leeward basin.',
      },
    ],
    autumn: [
      {
        good: 'glass',
        adjustment: 6,
        reason: 'Gardeners glaze the winter beds before the first freeze.',
      },
    ],
    winter: [
      {
        good: 'glass',
        adjustment: 8,
        reason: 'Cold snaps crack the glass that protects the winter crop.',
      },
      {
        good: 'grafts',
        adjustment: 5,
        reason: 'Replacement trees must take root under cover.',
      },
    ],
  },
  meridian: {
    spring: [
      {
        good: 'prisms',
        adjustment: 5,
        reason: 'Survey crews fit optics for the first long flights.',
      },
    ],
    summer: [
      {
        good: 'soundings',
        adjustment: -3,
        reason: 'Clear survey windows put extra folios on the exchange.',
      },
    ],
    autumn: [
      {
        good: 'soundings',
        adjustment: 6,
        reason:
          'Squall season closes balloon windows and fresh readings are scarce.',
      },
      {
        good: 'prisms',
        adjustment: 7,
        reason: 'Survey crews replace optics damaged in the outer squalls.',
      },
    ],
    winter: [
      {
        good: 'provisions',
        adjustment: 8,
        reason: 'Isolated balloon crews draw winter stores.',
      },
    ],
  },
}
export function seasonalPosting(port: PortId, day: number) {
  return postings[port][seasonAt(day)]
}
export function seasonalAdjustment(port: PortId, good: GoodId, day: number) {
  return (
    seasonalPosting(port, day).find((p) => p.good === good)?.adjustment ?? 0
  )
}
