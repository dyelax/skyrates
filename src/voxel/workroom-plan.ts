import type { PortId } from '../data'
import type { V2 } from './blocks'
import type { Deck } from './ports'

export const stations = ['market', 'authority', 'civic', 'shipyard'] as const
export type Station = (typeof stations)[number]
export type RoomTarget = 'worker' | 'counter' | 'door' | 'guest'
export const isStation = (value: string): value is Station => stations.some((s) => s === value)
export interface RoomPlan {
  w: number
  d: number
  height: number
  desk: V2
  deskWidth: number
  worker: V2
  feature: V2
  featureSize: V2
  entry: V2
  spawn: V2
  look: V2
  decks: Deck[]
  blocks: Deck[]
}
export function roomPlan(id: PortId, station: Station): RoomPlan {
  const scale = { sunstep: 0, glasshouse: 0.4, copperfall: 0.8, meridian: -0.35 }[id]
  const w = { market: 12.4, authority: 10.2, shipyard: 15.7, civic: 13.2 }[station] + scale
  const d = { market: 12.6, authority: 10.5, shipyard: 15, civic: 13.6 }[station]
  const height = { market: 5.1, authority: 4.9, shipyard: 6.6, civic: 5.6 }[station]
  const desk: V2 = [station === 'authority' ? 0.61 : 2.0, -d * 0.21]
  const deskWidth = station === 'market' ? 3.55 : station === 'shipyard' ? 2.86 : 2.67
  const worker: V2 = [desk[0] + 0.49, desk[1] - 0.99]
  const feature: V2 = [-w * 0.29, station === 'shipyard' ? -0.52 : -1.13]
  const featureSize: V2 =
    station === 'shipyard' ? [2.43, 5.3] : station === 'authority' ? [1.45, 1.63] : [2.07, 2.8]
  const entry: V2 = [0.2, d / 2]
  const blocks: Deck[] = [
    { x: desk[0], z: desk[1], w: deskWidth, d: 0.87 },
    { x: feature[0], z: feature[1], w: featureSize[0], d: featureSize[1] },
    { x: 0, z: -d / 2 + 0.53, w: w - 0.45, d: 1.04 },
    { x: w / 2 - 0.45, z: -0.9, w: 0.78, d: d * 0.57 },
    { x: w / 2 - 0.25, z: d / 2 - 0.1, w: w - 2.16, d: 0.68 },
    { x: -w / 2 + 0.25, z: d / 2 - 0.1, w: w - 2.16, d: 0.68 },
  ]
  const decks = [
    { x: 0, z: 0, w: w - 0.5, d: d - 0.11 },
    { x: entry[0], z: d / 2, w: 1.8, d: 1.45 },
  ]
  return {
    w,
    d,
    height,
    desk,
    deskWidth,
    worker,
    feature,
    featureSize,
    entry,
    spawn: [0.29, d * 0.33],
    look: [0, -d * 0.23],
    blocks,
    decks,
  }
}
