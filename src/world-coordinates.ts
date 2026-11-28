import type { Point } from './battle-model'
import type { PortId } from './data'

export const WORLD_PORTS: Record<PortId, Point> = {
  sunstep: { x: 0, y: 0 },
  glasshouse: { x: 10080, y: -7560 },
  copperfall: { x: 20580, y: 1512 },
  meridian: { x: 27972, y: -24108 },
}
