import type { Deck, Collision } from './ports'
import type { V2 } from './blocks'

export function mayWalk(x: number, z: number, decks: Deck[], blocks: Collision[], radius = 0.21) {
  const onDeck = decks.some((d) => Math.abs(x - d.x) <= d.w / 2 - radius && Math.abs(z - d.z) <= d.d / 2 - radius)
  return (
    onDeck && !blocks.some((d) => Math.abs(x - d.x) < d.w / 2 + radius && Math.abs(z - d.z) < d.d / 2 + radius)
  )
}
/** Route short mouse walks around stalls, garden beds and the edge of the floating dock. */
export function walkingPath(start: V2, end: V2, decks: Deck[], blocks: Collision[]): V2[] {
  if (!mayWalk(end[0], end[1], decks, blocks)) return []
  const step = 0.58
  const ax = Math.round(start[0] / step),
    az = Math.round(start[1] / step),
    ex = Math.round(end[0] / step),
    ez = Math.round(end[1] / step)
  const key = (x: number, z: number) => x + ',' + z
  const origin = key(ax, az),
    queue: [number, number][] = [[ax, az]],
    from = new Map<string, string | null>([[origin, null]])
  for (let i = 0; i < queue.length && i < 6700; i++) {
    const [x, z] = queue[i],
      here = key(x, z)
    if (x === ex && z === ez) {
      const points: V2[] = [end]
      let k = from.get(here)
      while (k && k !== origin) {
        const [a, b] = k.split(',').map(Number)
        points.push([a * step, b * step])
        k = from.get(k)
      }
      return points.reverse()
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz)
      if (from.has(k) || !mayWalk(nx * step, nz * step, decks, blocks)) continue
      if (
        dx &&
        dz &&
        (!mayWalk(x * step, nz * step, decks, blocks) || !mayWalk(nx * step, z * step, decks, blocks))
      )
        continue
      from.set(k, here)
      queue.push([nx, nz])
    }
  }
  return []
}
