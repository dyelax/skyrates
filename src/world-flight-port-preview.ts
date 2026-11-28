import { artwork } from './artwork'
import type { PortId } from './data'

type Point = { x: number; y: number }
const views = { overhead: 1.5, harbor: 0.73, counter: 0.415 } as const
type View = keyof typeof views
const angles = Object.keys(views) as View[]
const signedYaw = (id: PortId) => (id === 'sunstep' || id === 'copperfall' ? 0.19 : -0.19)

/** Orthographic pictures of the same asset in an explicitly calibrated frame.
 * Only accessed while a model streams or WebGL is unavailable. */
export class PortPreview {
  private images = new Map<string, HTMLImageElement>()
  private requested = new Set<string>()
  private dead = false
  private request(name: string, onError?: () => void) {
    if (this.requested.has(name)) return
    this.requested.add(name)
    const image = new Image()
    image.onload = () => {
      if (!this.dead) this.images.set(name, image)
    }
    image.onerror = () => {
      if (!this.dead) onError?.()
    }
    image.src = artwork(name)
  }
  draw(
    ctx: CanvasRenderingContext2D,
    id: PortId,
    center: Point,
    scale: number,
    elevation: number,
    yaw: number,
    night: number,
  ) {
    const prefix = 'flight-impostor-' + id + '-'
    const ordered = angles.slice().sort((a, b) => Math.abs(elevation - views[a]) - Math.abs(elevation - views[b]))
    this.request(prefix + ordered[0], () => this.request('flight-port-' + id))
    const match = ordered.find((key) => this.images.has(prefix + key))
    ctx.save()
    ctx.translate(center.x, center.y)
    if (match) {
      const from = views[match],
        turn = yaw - (match === 'overhead' ? 0 : signedYaw(id))
      // Convert the source ground plane to today's yaw, pitch and scale. Its
      // center remains on the true town origin even as the camera passes it.
      ctx.transform(
        Math.cos(turn),
        Math.sin(elevation) * Math.sin(turn),
        -Math.sin(turn) / Math.sin(from),
        (Math.sin(elevation) * Math.cos(turn)) / Math.sin(from),
        0,
        0,
      )
      const size = 576 * scale
      ctx.filter = night > 0.06 ? 'brightness(' + (1 - night * 0.29) + ')' : 'none'
      ctx.drawImage(this.images.get(prefix + match)!, -size / 2, -size / 2, size, size)
    } else {
      const lastResort = this.images.get('flight-port-' + id)
      if (lastResort) {
        const width = 394.5 * scale,
          height = (width * lastResort.height) / lastResort.width
        ctx.drawImage(lastResort, -width / 2, -height * 0.46, width, height)
      }
    }
    ctx.restore()
  }
  dispose() {
    this.dead = true
    this.images.clear()
  }
}
