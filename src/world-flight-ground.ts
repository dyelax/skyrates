import { PORT_IDS, type PortId } from './data'
import { WORLD_PORTS } from './world-flight'

type Point = { x: number; y: number }
const SPAN = 1536,
  SIZE = 400
const positive = (n: number, limit: number) => ((Math.floor(n) % limit) + limit) % limit

/** Fly over exactly one piece of the regional painting. Only the narrow shared
 * border mixes two samples. Terrain coordinates stay fixed as the camera turns. */
export class FlightGround {
  private sources = new Map<PortId, ImageData>()
  private tiles = new Map<string, HTMLCanvasElement>()
  register(port: PortId, source: ImageData) {
    this.sources.set(port, source)
    // Preserve tiles outside the incoming image's region; loading a distant
    // painting must not regenerate the current approach under the helm.
    for (const key of this.tiles.keys()) {
      const [col, row] = key.split(',').map(Number),
        x = (col + 0.5) * SPAN,
        y = (row + 0.5) * SPAN
      const range = (id: PortId) => Math.hypot(x - WORLD_PORTS[id].x, y - WORLD_PORTS[id].y)
      if (range(port) < Math.min(...Array.from(this.sources.keys(), range)) + SPAN * 2.45) this.tiles.delete(key)
    }
  }
  dispose() {
    this.tiles.clear()
    this.sources.clear()
  }
  draw(ctx: CanvasRenderingContext2D, center: Point, scale: number, width: number, height: number) {
    if (!this.sources.size) return
    const tileWidth = SPAN * scale,
      left = center.x - width / scale / 2,
      top = center.y - height / scale / 2
    for (let row = Math.floor(top / SPAN); row <= Math.floor((top + height / scale) / SPAN); row++) {
      for (let col = Math.floor(left / SPAN); col <= Math.floor((left + width / scale) / SPAN); col++) {
        const key = col + ',' + row
        let tile = this.tiles.get(key)
        if (!tile) {
          tile = this.makeTile(col, row)
          this.tiles.set(key, tile)
          if (this.tiles.size > 56) this.tiles.delete(this.tiles.keys().next().value!)
        }
        ctx.drawImage(
          tile,
          (col * SPAN - left) * scale,
          (row * SPAN - top) * scale,
          tileWidth + 0.35,
          tileWidth + 0.35,
        )
      }
    }
  }
  private makeTile(col: number, row: number) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')!,
      out = ctx.createImageData(SIZE, SIZE)
    const candidates = PORT_IDS.filter((id) => this.sources.has(id)).map((id) => ({
      point: WORLD_PORTS[id],
      source: this.sources.get(id)!,
    }))
    const distances = candidates.map((region) =>
      Math.hypot((col + 0.5) * SPAN - region.point.x, (row + 0.5) * SPAN - region.point.y),
    )
    const nearest = Math.min(...distances)
    const regions = candidates.filter((_, i) => distances[i] - nearest < SPAN * 2.45)
    const xs = Array.from({ length: SIZE }, (_, i) => (col + (i + 0.5) / SIZE) * SPAN)
    const bendX = xs.map((x) => Math.sin(x / 1380) * 270 + Math.sin(x / 540) * 65)
    const grainX = xs.map((x) => Math.sin(x / 2160) * 76 + Math.cos(x / 743) * 27)
    // Away from regional borders copy packed RGBA pixels without blending.
    if (regions.length === 1) {
      const src = regions[0].source,
        tex = new Uint32Array(src.data.buffer, src.data.byteOffset, src.width * src.height)
      const target = new Uint32Array(out.data.buffer, out.data.byteOffset, SIZE * SIZE)
      for (let j = 0; j < SIZE; j++) {
        const y = (row + (j + 0.5) / SIZE) * SPAN,
          grainY = Math.sin(y / 1130) * 83 + Math.cos(y / 570) * 24
        for (let i = 0; i < SIZE; i++)
          target[j * SIZE + i] =
            tex[
              positive(y * 0.25 + grainX[i], src.height) * src.width + positive(xs[i] * 0.25 + grainY, src.width)
            ]
      }
      ctx.putImageData(out, 0, 0)
      return canvas
    }
    for (let j = 0; j < SIZE; j++) {
      const y = (row + (j + 0.5) / SIZE) * SPAN,
        bendY = Math.sin(y / 1600) * 315 + Math.cos(y / 470) * 48
      const grainY = Math.sin(y / 1130) * 83 + Math.cos(y / 570) * 24
      for (let i = 0; i < SIZE; i++) {
        const x = xs[i],
          a = x + bendY,
          b = y + bendX[i]
        let first = regions[0],
          next = regions[0],
          firstD = Infinity,
          nextD = Infinity
        if (regions.length > 1) {
          for (const r of regions) {
            const dx = a - r.point.x,
              dy = b - r.point.y,
              d = dx * dx + dy * dy
            if (d < firstD) {
              next = first
              nextD = firstD
              first = r
              firstD = d
            } else if (d < nextD) {
              next = r
              nextD = d
            }
          }
        }
        const src = first.source
        const u = x * 0.25 + grainY,
          v = y * 0.25 + grainX[i]
        const offset = (positive(v, src.height) * src.width + positive(u, src.width)) * 4
        const target = (j * SIZE + i) * 4
        // Roughly twenty screen pixels at the edge, and an unmixed landscape on either side.
        const mix = regions.length > 1 ? Math.max(0, 0.5 - (Math.sqrt(nextD) - Math.sqrt(firstD)) / 110) : 0
        for (let c = 0; c < 3; c++)
          out.data[target + c] = src.data[offset + c] * (1 - mix) + next.source.data[offset + c] * mix
        out.data[target + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)
    return canvas
  }
}
