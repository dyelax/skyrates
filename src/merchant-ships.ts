import type { GoodId } from './data'

export const MERCHANT_SHIPS = {
  'lane-0': {
    id: 'plum-schooner',
    name: 'Plum Schooner',
    hull: 64,
    crew: 4,
    cannons: 0,
    cargo: { good: 'provisions', quantity: 9 },
  },
  'lane-1': {
    id: 'glass-carrier',
    name: 'Glass Carrier',
    hull: 74,
    crew: 5,
    cannons: 2,
    cargo: { good: 'glass', quantity: 6 },
  },
  'lane-2': {
    id: 'yard-packet',
    name: 'Yard Packet',
    hull: 82,
    crew: 5,
    cannons: 0,
    cargo: { good: 'machinery', quantity: 8 },
  },
  'lane-3': {
    id: 'survey-barge',
    name: 'Survey Barge',
    hull: 76,
    crew: 6,
    cannons: 2,
    cargo: { good: 'soundings', quantity: 6 },
  },
} as const satisfies Record<
  string,
  { id: string; name: string; hull: number; crew: number; cannons: number; cargo: { good: GoodId; quantity: number } }
>
export type MerchantClass = (typeof MERCHANT_SHIPS)[keyof typeof MERCHANT_SHIPS]['id']
export const merchantShip = (actor: string | undefined) =>
  actor && Object.hasOwn(MERCHANT_SHIPS, actor) ? MERCHANT_SHIPS[actor as keyof typeof MERCHANT_SHIPS] : undefined
