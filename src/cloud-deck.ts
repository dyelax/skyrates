import type Phaser from 'phaser'
import type { WeatherReport } from './weather'
import type { Point } from './battle-model'

type RGB = readonly [number, number, number]
const sunlight: Record<WeatherReport['season'], RGB> = {
  spring: [247, 238, 207],
  summer: [255, 228, 178],
  autumn: [244, 206, 167],
  winter: [223, 238, 250],
}
const weatherColor: Record<WeatherReport['kind'], RGB> = {
  clear: [123, 176, 169],
  haze: [215, 193, 155],
  rain: [90, 121, 142],
  frost: [178, 202, 216],
  squall: [74, 91, 115],
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const wrap = (value: number, period: number) => ((value % period) + period) % period
function smooth(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

interface Bank {
  core: Phaser.GameObjects.Image
  shoulder: Phaser.GameObjects.Image
  u: number
  v: number
  size: number
  phase: number
  foreground: boolean
}

// Wrap the original painting by feathering overlapping edges. Unlike a mirror,
// a long northbound drift never reveals a line of symmetrical cloud peaks.
function paintTextures(scene: Phaser.Scene, report: WeatherReport, hasTerrain: boolean) {
  const sea = scene.textures.get('sea').getSourceImage() as HTMLImageElement
  const width = 1024,
    height = 512,
    overlapX = 156,
    overlapY = 86
  const bottom = scene.textures.createCanvas('cloud-deep', width, height)!
  const ground = bottom.context
  const copy = document.createElement('canvas')
  copy.width = width + overlapX
  copy.height = height + overlapY
  const source = copy.getContext('2d')!
  source.drawImage(sea, 0, 0, copy.width, copy.height)
  const sample = source.getImageData(0, 0, copy.width, copy.height).data
  const tile = ground.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    const wy = smooth(0, overlapY, y)
    const row = y * copy.width
    const upper = y < overlapY ? row + height * copy.width : row
    for (let x = 0; x < width; x++) {
      const wx = smooth(0, overlapX, x)
      const left = x < overlapX ? x + width : x
      const i = 4 * (y * width + x)
      for (let channel = 0; channel < 3; channel++) {
        const a = mix(sample[4 * (upper + left) + channel], sample[4 * (upper + x) + channel], wx)
        const b = mix(sample[4 * (row + left) + channel], sample[4 * (row + x) + channel], wx)
        tile.data[i + channel] = mix(a, b, wy)
      }
      tile.data[i + 3] = 255
    }
  }
  // Lift the bright ridges out of the familiar deep-cloud painting. The wind
  // moves this sheet over the land; the ground can be seen between its crests.
  // Bake each soft, offset cloud shadow into the same tile to save a draw pass.
  if (hasTerrain) {
    const mask = new Float32Array(width * height)
    const pixels = tile.data
    for (let i = 0; i < mask.length; i++) {
      const n = i * 4
      const luminance = (pixels[n] * .31 + pixels[n + 1] * .56 + pixels[n + 2] * .13) / 255
      mask[i] = smooth(.56, .84, luminance) * .8
    }
    const shadowColor = [53, 77, 87]
    for (let y = 0; y < height; y++) {
      const shadowRow = ((y - 14 + height) % height) * width
      for (let x = 0; x < width; x++) {
        const i = y * width + x, n = i * 4
        const cloud = mask[i]
        const shadow = mask[shadowRow + (x - 22 + width) % width] * .27 * (1 - cloud)
        const alpha = cloud + shadow
        pixels[n + 3] = alpha * 255
        if (alpha > 0) for (let c = 0; c < 3; c++) {
          pixels[n + c] = (pixels[n + c] * cloud + shadowColor[c] * shadow) / alpha
        }
      }
    }
  }
  ground.putImageData(tile, 0, 0)
  const light = sunlight[report.season], shade = weatherColor[report.kind]
  ground.globalCompositeOperation = 'source-atop'
  ground.fillStyle = 'rgb(' + light.join(',') + ')'
  ground.globalAlpha = .09
  ground.fillRect(0, 0, width, height)
  ground.fillStyle = 'rgb(' + shade.join(',') + ')'
  ground.globalAlpha = .04 + .28 * report.severity
  ground.fillRect(0, 0, width, height)
  bottom.refresh()

  const bankShade = light.map((_, c) => mix(shade[c], [78, 107, 125][c], 0.55))
  const bankLight = light.map((v, c) => mix(v, [218, 232, 247][c], 0.75 * report.severity))
  const dome = (x: number, y: number, rx: number, ry: number) => 1 - (x / rx) ** 2 - (y / ry) ** 2
  for (let variant = 0; variant < 3; variant++) {
    const w = 256,
      h = 160
    const tex = scene.textures.createCanvas('cloud-billow-' + variant, w, h)!
    const ctx = tex.context
    const cropX = [0.02, 0.34, 0.48][variant],
      cropY = [0.05, 0.38, 0.18][variant]
    ctx.drawImage(
      sea,
      sea.naturalWidth * cropX,
      sea.naturalHeight * cropY,
      sea.naturalWidth * 0.48,
      sea.naturalHeight * 0.54,
      0,
      0,
      w,
      h,
    )
    const pixels = ctx.getImageData(0, 0, w, h)
    const data = pixels.data
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4,
          nx = (2 * x) / w - 1,
          ny = (2 * y) / h - 1
        const ink = (data[i] * 0.31 + data[i + 1] * 0.56 + data[i + 2] * 0.13) / 255
        const lobes = Math.max(
          dome(nx + 0.44, ny - 0.13, 0.46, 0.48),
          dome(nx + 0.14, ny + 0.15, 0.47, 0.64),
          dome(nx - 0.24, ny + 0.03, 0.39, 0.67),
          dome(nx - 0.55, ny - 0.18, 0.34, 0.43),
        )
        const density = lobes + (ink - 0.54) * 1.4 + 0.09 * Math.sin(nx * 20 + ny * 8 + variant)
        const edge = smooth(-0.18, 0.52, density)
        const rim = smooth(0.72, 0.99, ink) * (1 - smooth(0.1, 0.82, lobes))
        const lit = Math.min(1, smooth(0.3, 0.94, ink) * 0.89 + rim * 0.21)
        for (let c = 0; c < 3; c++) {
          data[i + c] = mix(bankShade[c], bankLight[c], lit)
        }
        // Feather the rectangular crop even where a bright crest reaches an edge.
        // Two transparent texels also protect the trim under linear filtering.
        const margin = Math.min(x, y, w - 1 - x, h - 1 - y)
        data[i + 3] = 255 * edge * smooth(2, 16, margin) * (0.27 + 0.73 * smooth(0.34, 0.8, ink))
      }
    ctx.putImageData(pixels, 0, 0)
    tex.refresh()
  }
}

// The tactical chart is bounded. Leave enough of the one continuous regional
// painting behind every edge for an entire crossing, plus the collision shake.
const LAND_TRAVEL = 0.2
const SHAKE_MARGIN = 8
export function terrainPlacement(width: number, height: number, imageWidth: number, imageHeight: number, x: number, y: number) {
  const scale = Math.max(
    (width * (1 + LAND_TRAVEL) + 2 * SHAKE_MARGIN) / imageWidth,
    (height * (1 + LAND_TRAVEL) + 2 * SHAKE_MARGIN) / imageHeight,
  )
  const pan = (travel: number, room: number) => Math.max(-room, Math.min(room, travel * LAND_TRAVEL))
  return {
    scale,
    x: width / 2 - pan(x, (imageWidth * scale - width) / 2 - SHAKE_MARGIN),
    y: height / 2 - pan(y, (imageHeight * scale - height) / 2 - SHAKE_MARGIN),
  }
}

export class CloudDeck {
  private readonly terrain?: Phaser.GameObjects.Image
  private readonly atmosphere?: Phaser.GameObjects.Rectangle
  private readonly bottom: Phaser.GameObjects.TileSprite
  private readonly banks: Bank[] = []
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  private staticAir = this.reduced.matches
  private elapsed = 0
  private flightX: number
  private flightY: number
  private width = 0
  private height = 0

  constructor(
    private scene: Phaser.Scene,
    private weather: WeatherReport,
    private drill: boolean,
    width: number,
    height: number,
    player: Point,
  ) {
    this.flightX = this.staticAir ? 0 : player.x - width / 2
    this.flightY = this.staticAir ? 0 : player.y - height / 2
    // A missing optional location plate leaves the original opaque cloud sea.
    // Scene teardown releases the images and their per-battle canvas textures.
    if (scene.textures.exists('battle-terrain')) {
      this.terrain = scene.add.image(0, 0, 'battle-terrain').setDepth(0)
      // The blue-grey air column keeps the distant roofs and cliffs behind
      // both silhouettes, including the Wayfarer's pale sails over warm orchards.
      const distanceColor = weather.kind === 'squall' ? [44, 67, 85] : [99, 138, 153]
      const [r, g, b] = weatherColor[weather.kind].map((v, i) => Math.round(mix(v, distanceColor[i], .55)))
      const color = (r << 16) | (g << 8) | b
      this.atmosphere = scene.add.rectangle(0, 0, 1, 1, color, .3 + .35 * weather.severity)
        .setOrigin(0).setDepth(.1)
    }
    paintTextures(scene, weather, Boolean(this.terrain))
    this.bottom = scene.add.tileSprite(0, 0, 1, 1, 'cloud-deep').setOrigin(0).setDepth(.5)
    this.resize(width, height)
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return
    if (this.width && this.height) {
      this.flightX *= width / this.width
      this.flightY *= height / this.height
    }
    this.width = width
    this.height = height
    this.atmosphere?.setSize(width, height)
    this.bottom.setSize(width, height).setTileScale(Math.min(2, Math.max(1.05, height / 1040)))
    // Fixed world-size cells keep a tall phone chart from stretching the clouds.
    // Rebuild only on layout changes; the animation reuses the same images.
    this.banks.forEach((b) => {
      b.core.destroy()
      b.shoulder.destroy()
    })
    this.banks.length = 0
    // Wind carries the low deck on even the clearest day. Only squall
    // fronts build banks at flight altitude; training always keeps that air clear.
    const upperBanks = !this.drill && this.weather.kind === 'squall'
    const layers = upperBanks ? 2 : 1
    for (let layer = 0; layer < layers; layer++) {
      const high = layer === 1
      const cols = high ? 3 : 4,
        rows = Math.max(2, Math.min(9, Math.ceil((height + 420) / (high ? 370 : 320))))
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col
          const phase = col * 1.31 + row * 2.41 + layer * 0.91
          const size = (high ? 238 + this.weather.severity * 190 : 261) * (1 + 0.18 * Math.sin(phase * 3))
          const key = 'cloud-billow-' + ((index + layer) % 3)
          const depth = high ? 6 : 1.1
          const core = this.scene.add.image(0, 0, key).setDepth(depth)
          const shoulder = this.scene.add
            .image(0, 0, 'cloud-billow-' + ((index + 2) % 3))
            .setDepth(depth + 0.01)
          this.banks.push({
            core,
            shoulder,
            phase,
            size,
            foreground: high,
            u: (col + 0.35 + 0.38 * (row % 2) + 0.13 * Math.sin(phase * 1.8)) / cols,
            v: (row + 0.54 + 0.23 * Math.sin(phase * 3.6)) / rows,
          })
        }
    }
    this.paint()
  }

  update(dt: number, dx: number, dy: number) {
    if (this.staticAir !== this.reduced.matches) {
      this.staticAir = this.reduced.matches
      this.paint()
    }
    if (this.staticAir || (this.drill && !dx && !dy)) return
    this.flightX += dx
    this.flightY += dy
    if (!this.drill) this.elapsed += dt
    this.paint()
  }

  private paint() {
    const t = this.elapsed,
      report = this.weather
    const wind = this.drill ? { x: 0, y: 0 } : report.wind
    const strength = report.severity
    if (this.terrain) {
      const { scale, x, y } = terrainPlacement(this.width, this.height, this.terrain.width, this.terrain.height, this.flightX, this.flightY)
      this.terrain.setScale(scale).setPosition(x, y)
    }
    // Tile position is in source texels and scrolls in the opposite direction.
    // Keep flight rates in chart units across every viewport and backing scale.
    this.bottom.tilePositionX = 57 - wind.x * t * 3 + this.flightX * .42 / this.bottom.tileScaleX
    this.bottom.tilePositionY = 41 - wind.y * t * 3 + this.flightY * .42 / this.bottom.tileScaleY
    // Wrap fully outside the chart. All depths move downwind; shear changes
    // the shape of each bank while the broad openings travel with the air.
    const margin = 365,
      across = this.width + 2 * margin,
      down = this.height + 2 * margin
    for (const b of this.banks) {
      const speed = b.foreground ? 53 : 19,
        phase = b.phase
      const swell = Math.sin(t * 0.22 + phase),
        roll = Math.cos(t * 0.16 + phase * 1.7)
      const travel = b.foreground ? .82 : .56
      const x = wrap(b.u * across + wind.x * t * speed - this.flightX * travel, across) - margin
      const y = wrap(b.v * down + wind.y * t * speed - this.flightY * travel, down) - margin
      const angle = -0.25 + 0.26 * Math.sin(phase * 2.2) + roll * 0.045
      const size = b.size * (1 + 0.044 * swell)
      const density = b.foreground ? Math.min(0.94, 0.05 + 1.06 * strength ** 2) : 0.21
      const alpha = this.staticAir && b.foreground ? density * 0.64 : density
      b.core
        .setPosition(x, y)
        .setDisplaySize(size, size * (0.6 + roll * 0.025))
        .setRotation(angle)
        .setAlpha(alpha)
      b.shoulder
        .setPosition(x + size * (0.21 + 0.04 * roll), y + size * (0.07 + 0.034 * swell))
        .setDisplaySize(size * 0.76, size * (0.35 + 0.026 * roll))
        .setRotation(angle - 0.24)
        .setAlpha(alpha * 0.75)
    }
  }
}
