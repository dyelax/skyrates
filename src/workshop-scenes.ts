import type { PortId } from './data'
import type { RoomTarget, Station } from './voxel/workroom-plan'

// Coordinates in each original illustration, independent of viewport dimensions.
export type RoomPoint = [number, number]
interface IllustratedRoom {
  art: string
  worker: RoomPoint
  counter: RoomPoint
  door: RoomPoint
  guest?: RoomPoint
}
export const ROOM_SCENES: Record<PortId, Record<Station, IllustratedRoom>> = {
  sunstep: {
    authority: { art: 'authority', worker: [40, 42], counter: [56, 81], door: [89, 48] },
    civic: { art: 'civic-sunstep', worker: [36, 47], counter: [46, 81], door: [62, 48] },
    market: { art: 'room-market-sunstep', worker: [24, 48], counter: [51, 76], guest: [85, 49], door: [75, 32] },
    shipyard: { art: 'room-yard-sunstep', worker: [23, 49], counter: [49, 73], door: [89, 43] },
  },
  glasshouse: {
    authority: { art: 'office-iona', worker: [25, 42], counter: [18, 76], door: [59, 45] },
    civic: { art: 'civic-glasshouse', worker: [72, 65], counter: [67, 80], door: [85, 47] },
    market: { art: 'room-market-glasshouse', worker: [26, 51], counter: [50, 70], guest: [66, 46], door: [90, 40] },
    shipyard: { art: 'room-yard-glasshouse', worker: [28, 56], counter: [54, 78], door: [89, 46] },
  },
  copperfall: {
    authority: { art: 'office-orr', worker: [24, 41], counter: [45, 77], door: [84, 44] },
    civic: { art: 'civic-copperfall', worker: [35, 65], counter: [21, 80], door: [75, 52] },
    market: { art: 'room-market-copperfall', worker: [27, 52], counter: [53, 74], guest: [84, 51], door: [75, 41] },
    shipyard: { art: 'room-yard-copperfall', worker: [28, 50], counter: [53, 73], door: [88, 40] },
  },
  meridian: {
    authority: { art: 'office-sen', worker: [25, 48], counter: [56, 75], door: [89, 45] },
    civic: { art: 'civic-meridian', worker: [17, 52], counter: [54, 74], door: [85, 51] },
    market: { art: 'room-market-meridian', worker: [27, 48], counter: [44, 67], guest: [71, 44], door: [88, 41] },
    shipyard: { art: 'room-yard-meridian', worker: [27, 48], counter: [50, 75], door: [87, 45] },
  },
}

export function roomTargets(room: IllustratedRoom): RoomTarget[] {
  return room.guest ? ['worker', 'counter', 'guest', 'door'] : ['worker', 'counter', 'door']
}
