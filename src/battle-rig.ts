import type Phaser from 'phaser'
import type { Vessel } from './battle-model'
import { hullCanvas } from './battle-damage'

export const POSE_WIDTH = 512
export const BANK_STEP = .075
export const MAX_POSE = 9

// Each sail plan follows the mast and sail positions in its original painting.
// The y values below are elevations above the keel, in units of the painted beam.
const SCHOONER_RIG = [[.31, .22, .53], [.61, .22, .55], [.77, .17, .24]]
const RAIDER_RIG = [[.24, .10, .28], [.42, .20, .58], [.65, .11, .29]]

function rigElevation(x: number, raider: boolean) {
  let height = 0
  for (const [mast, span, peak] of raider ? RAIDER_RIG : SCHOONER_RIG) {
    const distance = (x - mast) / span
    height = Math.max(height, peak * Math.max(0, 1 - distance * distance))
  }
  return height
}

// Project strips of the painted deck and raised rig around the long keel.
// Both Canvas and WebGL use the same antialiased pose. Poses are built only
// when a bank is first reached; previous damage stages release their copies.
function paintPose(scene: Phaser.Scene, sourceKey: string, step: number, name: string) {
  const source = scene.textures.get(sourceKey)
  const image = source.getSourceImage() as HTMLCanvasElement
  const sourceWidth = source.get().width, sourceHeight = source.get().height
  const h = POSE_WIDTH * sourceHeight / sourceWidth
  const height = Math.ceil(h * 1.45)
  const tex = hullCanvas(scene, name, POSE_WIDTH, height)!
  drawBankedHull(tex.context, image, sourceWidth, sourceHeight, step)
  tex.refresh()
}

export function drawBankedHull(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement | HTMLImageElement, sourceWidth: number, sourceHeight: number, step: number) {
  const h = POSE_WIDTH * sourceHeight / sourceWidth, height = Math.ceil(h * 1.45)
  const roll = step * BANK_STEP, sin = Math.sin(roll), cos = Math.cos(roll)
  const raider = sourceHeight / sourceWidth > .37
  const center = raider ? .51 : .60
  const keelY = height / 2 + (center - .5) * h
  ctx.imageSmoothingQuality = 'high'

  // Heights are continuous at strip boundaries. Round projected edges once per
  // column so adjacent samples share pixels without seams or doubled alpha.
  const stations = [0, center - .17, center, center + .17, 1]
  for (let x = 0; x < POSE_WIDTH; x += 2) {
    const u = (x + 1) / POSE_WIDTH
    const wing = rigElevation(u, raider)
    const heights = [wing * .90, wing * .36, wing * .29, wing * .36, wing * .90]
    // Join the raised wooden rail to the narrower keel as one timber surface.
    // The ends taper before the bowsprit and stern pennants, which have no keel.
    const beam = Math.sqrt(Math.min(1, u / .065)) * Math.max(0, Math.min(1, (.90 - u) / .36))
    if (beam > 0) {
      const side = -Math.sign(sin)
      const halfBeam = (raider ? .17 : .16) * beam
      const rail = keelY + h * (side * halfBeam * cos + heights[1] * sin)
      const keel = keelY + h * (side * halfBeam * .69 * cos - .22 * beam * sin)
      if ((rail - keel) * sin > 0) {
        const depth = keel - rail
        ctx.fillStyle = raider ? '#53322b' : '#715139'
        ctx.fillRect(x, rail, 2, depth)
        ctx.fillStyle = raider ? '#34262a' : '#473a2f'
        ctx.fillRect(x, rail + depth * .52, 2, depth * .48)
      }
    }
    let top = Math.round(keelY + (-center * cos + heights[0] * sin) * h)
    for (let i = 1; i < stations.length; i++) {
      const bottom = Math.round(keelY + ((stations[i] - center) * cos + heights[i] * sin) * h)
      const sourceY = stations[i - 1] * sourceHeight
      const bandHeight = (stations[i] - stations[i - 1]) * sourceHeight
      ctx.drawImage(image, x * sourceWidth / POSE_WIDTH, sourceY, 2 * sourceWidth / POSE_WIDTH,
        bandHeight, x, top, 2, bottom - top)
      top = bottom
    }
  }
  // Preserve the artist's palette and let the low side pass under a soft shadow.
  const shade = ctx.createLinearGradient(0, keelY - h*.44, 0, keelY + h*.44)
  const dark = 'rgba(23,31,42,' + Math.abs(sin) * .43 + ')'
  shade.addColorStop(0, sin < 0 ? dark : 'transparent')
  shade.addColorStop(1, sin > 0 ? dark : 'transparent')
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, POSE_WIDTH, height)
}

export class AirshipRig {
  readonly hull: Phaser.GameObjects.Image
  readonly shadow: Phaser.GameObjects.Image
  private source: string
  private poses = new Set<string>()

  constructor(private scene: Phaser.Scene, key: string, private length: number, private posePrefix = '') {
    this.source = key
    this.shadow = scene.add.image(0, 0, key).setTintFill(0x112e38).setAlpha(.37).setDepth(3)
    this.hull = scene.add.image(0, 0, key).setDepth(5)
    const scale = length / this.hull.width
    this.hull.setScale(scale)
    this.shadow.setScale(scale)
  }

  update(ship: Vessel) {
    // Damage FX sets the true silhouette on the shadow. The visible painting
    // always inherits that damaged frame before applying its signed roll.
    const source = this.shadow.texture.key
    if (this.source !== source) {
      this.hull.setTexture(source)
      for (const key of this.poses) this.scene.textures.remove(key)
      this.poses.clear()
      this.source = source
    }
    const step = Math.max(-MAX_POSE, Math.min(MAX_POSE, Math.round(ship.heel / BANK_STEP)))
    const pose = step ? source + this.posePrefix + '-bank-' + step : source
    if (step && !this.poses.has(pose)) {
      paintPose(this.scene, source, step, pose)
      this.poses.add(pose)
    }
    if (this.hull.texture.key !== pose) this.hull.setTexture(pose)
    const scale = this.length / this.hull.width
    this.hull.setPosition(ship.x, ship.y).setRotation(ship.heading).setScale(scale)
    const shadowScale = this.length / this.shadow.width
    const keel = -Math.sin(step * BANK_STEP) * 4
    this.shadow.setPosition(ship.x + 3.5 - Math.sin(ship.heading) * keel, ship.y + 8 + Math.cos(ship.heading) * keel)
      .setRotation(ship.heading).setScale(shadowScale, shadowScale * Math.cos(step * BANK_STEP))
  }
}
