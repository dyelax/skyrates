import type { Point } from './battle-model'
import { PORT_IDS, type PortId } from './data'
import type { FlightLight } from './world-flight-light'
import { islandNoise, isletOutline, skyIsletsNear, type SkyIslet } from './world-islets'

type Vertex = [number, number, number]
type RGB = [number, number, number]
type Project = (point: Point, height: number) => Point
type Tile = 'meadow' | 'limestone' | 'strata' | 'masonry'
type Sheet = Tile | 'settlements'
interface Face {
  points: Vertex[]
  color: RGB
  normal: Vertex
  center: Vertex
  layer: number
  tile?: Tile
}
interface Cluster {
  at: Vertex
  region: PortId
  row: number
  width: number
}
interface Model {
  faces: Face[]
  clusters: Cluster[]
  sprite?: { image: HTMLCanvasElement; left: number; top: number; stamp: string; density: number }
}
const rgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
const tone = (a: RGB, t: number): RGB => [a[0] * t, a[1] * t, a[2] * t]
const dot = (a: Vertex, b: Vertex) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const lerp = (a: Vertex, b: Vertex, t: number): Vertex => a.map((n, k) => n + (b[k] - n) * t) as Vertex
const css = (c: RGB) => 'rgb(' + c.map((x) => Math.round(x)).join(',') + ')'
const TAU = Math.PI * 2
const palettes: Record<
  PortId,
  { grass: string; stone: string; soil: string; trim: string; leaf: string; flower: string }
> = {
  sunstep: {
    grass: '#a4a567',
    stone: '#baaf94',
    soil: '#a7875e',
    trim: '#d6c5a6',
    leaf: '#6e884d',
    flower: '#e4bc64',
  },
  glasshouse: {
    grass: '#8fa388',
    stone: '#939a90',
    soil: '#998d72',
    trim: '#c6c1a3',
    leaf: '#65856e',
    flower: '#bb96c8',
  },
  copperfall: {
    grass: '#a18a5d',
    stone: '#a47a63',
    soil: '#9e674e',
    trim: '#bc9677',
    leaf: '#718469',
    flower: '#c99569',
  },
  meridian: {
    grass: '#b7c3bd',
    stone: '#8592a3',
    soil: '#90969b',
    trim: '#d0d3c8',
    leaf: '#5b807b',
    flower: '#dce2d8',
  },
}
const tileUrls: Record<Tile, string> = {
  meadow: new URL('../tools/ports/materials/meadow.jpg', import.meta.url).href,
  limestone: new URL('../tools/ports/materials/limestone.jpg', import.meta.url).href,
  strata: new URL('../tools/ports/materials/strata.jpg', import.meta.url).href,
  masonry: new URL('../tools/ports/materials/masonry.jpg', import.meta.url).href,
}
const images = new Map<Sheet, HTMLImageElement>()
let requested = false,
  revision = 0
function loadPaints() {
  if (requested) return
  requested = true
  const urls = {
    ...tileUrls,
    settlements: new URL(import.meta.env.BASE_URL + 'art/islet-settlements.webp?v=1', document.baseURI).href,
  }
  for (const [key, url] of Object.entries(urls)) {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      images.set(key as Sheet, image)
      revision++
    }
    image.src = url
  }
}

function build(isle: SkyIslet): Model {
  const faces: Face[] = [],
    clusters: Cluster[] = []
  const r = isle.radius,
    noise = (salt: number) => islandNoise(isle.seed, salt)
  const tint = (k: keyof typeof palettes.sunstep) =>
    mix(rgb(palettes[isle.region][k]), rgb(palettes[isle.neighbor][k]), isle.blend)
  const turn = noise(6) * TAU,
    c = Math.cos(turn),
    s = Math.sin(turn),
    wide = 0.58 + 0.32 * noise(7)
  const orient = (x: number, y: number, z: number): Vertex => [x * c - y * s, x * s + y * c, z]
  const lip: Vertex[] = isletOutline(isle).map((p) => [p.x - isle.x, p.y - isle.y, 0])
  function face(points: Vertex[], color: RGB, layer = 0, tile?: Tile) {
    const [a, b, c] = points,
      ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2]
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx,
      n = Math.hypot(nx, ny, nz)
    if (n < 1e-5) return
    const center: Vertex = [0, 0, 0]
    for (const p of points) p.forEach((v, k) => (center[k] += v / points.length))
    faces.push({ points, color, layer, tile, center, normal: [nx / n, ny / n, nz / n] })
  }
  function ring(scale: number, drop: number, rough: number, salt: number) {
    return lip.map(([x, y], i): Vertex => {
      const k = scale + (noise(i + salt) - 0.5) * rough
      return [k * x + drop * 0.07 * r, k * y, drop * r * (0.56 + 0.68 * noise(i + salt + 33))]
    })
  }
  const toe = ring(0.29, -0.94 - 0.17 * noise(176), 0.25, 100),
    knuckle = ring(0.81, -0.46, 0.23, 138),
    shoulder = ring(0.93, -0.19, 0.11, 178)
  const upper = ring(0.81, 0.062, 0.042, 212)
  const rock = isle.region === 'copperfall' ? 'strata' : 'limestone'
  for (let i = 0; i < lip.length; i++) {
    const j = (i + 1) % lip.length
    for (const [lower, higher, color] of [
      [toe, knuckle, tone(tint('stone'), 0.68)],
      [knuckle, shoulder, tint('stone')],
      [shoulder, lip, tint('soil')],
    ] as const) {
      const a = lower[i],
        b = lower[j],
        g = higher[j],
        h = higher[i],
        col = tone(color, 0.82 + 0.27 * noise(232 + i))
      face([a, b, g], col, 0, rock)
      face([a, g, h], tone(col, 0.85 + 0.2 * noise(246 + i)), 0, rock)
    }
    // Individual buttresses hang under the turf. Their fractured toes alternate
    // with deep recesses instead of forming stripes around the whole island.
    const top = lerp(lip[i], lip[j], 0.5),
      mid = lerp(shoulder[i], shoulder[j], 0.52)
    const edge = lerp(knuckle[i], knuckle[j], 0.44),
      depth = r * (0.46 + 0.48 * noise(302 + i))
    const root: Vertex = [edge[0] * 0.82, edge[1] * 0.82, -depth]
    const left = lerp(lip[i], lip[j], 0.14),
      right = lerp(lip[i], lip[j], 0.82)
    for (const p of [left, top, right]) p[2] -= r * 0.055
    const tip: Vertex = [mid[0] * 1.04, mid[1] * 1.04, mid[2] - 0.08 * r * noise(319 + i)]
    face([root, tip, left], tone(tint('stone'), 0.91), 0, rock)
    face([root, right, tip], tone(tint('stone'), 0.66 + 0.22 * noise(i)), 0, rock)
    face([tip, right, top, left], tone(tint('stone'), 1.07), 0, rock)
    if (i % 3 !== 0) {
      const seam = [
        lerp(left, tip, 0.23),
        lerp(right, tip, 0.32),
        lerp(right, tip, 0.4),
        lerp(left, tip, 0.33),
      ]
      face(seam.reverse(), tone(tint('trim'), 0.94), 0, rock)
    }
    face([lip[i], lip[j], upper[j], upper[i]], tone(tint('grass'), 0.86 + 0.16 * noise(350 + i)), 1, 'meadow')
    face(
      [upper[i], upper[j], [0, 0, r * 0.073]],
      tone(tint('grass'), 0.94 + 0.07 * noise(369 + i)),
      1,
      isle.region === 'meridian' ? 'limestone' : 'meadow',
    )
  }
  const surface = r * 0.079,
    wood = rgb('#a3835b'),
    iron = rgb('#786858')
  function block(
    x: number,
    y: number,
    w: number,
    d: number,
    z: number,
    h: number,
    col: RGB,
    layer: number,
    tile?: Tile,
  ) {
    const a = [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d],
    ].map(([u, v]) => orient(x + u * 0.5, y + v * 0.5, z))
    const cap = a.map(([u, v]): Vertex => [u, v, z + h])
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      face([a[i], a[j], cap[j], cap[i]], col, layer, tile)
    }
    face(cap, tone(col, 1.04), layer, tile)
  }
  // Retaining walls give the upper garden a readable rise above the small quay.
  const pad = Array.from({ length: 12 }, (_, i) => {
    const a = (TAU * i) / 12,
      k = 1 + 0.074 * (noise(396 + i) - 0.5)
    return orient((-0.13 + 0.49 * k * Math.cos(a)) * r, (-0.12 + 0.38 * k * Math.sin(a)) * r * wide, surface)
  })
  const terraceHeight = r * (0.08 + 0.045 * noise(408))
  const crown = pad.map(([x, y, z]): Vertex => [x, y, z + terraceHeight])
  for (let i = 0; i < pad.length; i++) {
    const j = (i + 1) % pad.length
    const sill = lerp(pad[i], crown[i], 0.84),
      other = lerp(pad[j], crown[j], 0.84)
    face([pad[i], pad[j], other, sill], tint('stone'), 2, 'masonry')
    face([sill, other, crown[j], crown[i]], tint('trim'), 2, 'limestone')
  }
  face(crown, tone(tint('grass'), 1.025), 3, isle.region === 'meridian' ? 'limestone' : 'meadow')
  if (isle.kind !== 'wild') {
    const road = [
      [0.66, 0.05],
      [0.43, 0.07],
      [0.28, 0.2],
      [0.09, 0.28],
      [-0.23, 0.27],
    ]
    for (let i = 1; i < road.length; i++) {
      const [x, y] = road[i - 1],
        [u, v] = road[i],
        band = 0.047
      face(
        [
          orient(x * r, (y - band) * r * wide, surface + 0.18),
          orient(u * r, (v - band) * r * wide, surface + 0.18),
          orient(u * r, (v + band) * r * wide, surface + 0.18),
          orient(x * r, (y + band) * r * wide, surface + 0.18),
        ].reverse(),
        tint('trim'),
        2,
        'masonry',
      )
    }
    for (let i = 0; i < 5; i++)
      block(
        (0.325 - 0.045 * i) * r,
        0.075 * r * wide,
        0.046 * r,
        0.15 * r,
        surface,
        ((i + 1) * terraceHeight) / 5,
        tint('trim'),
        3,
        'masonry',
      )
    const shore = Math.hypot(lip[0][0], lip[0][1])
    for (let i = 0; i < 9; i++)
      block(
        shore * (0.71 + 0.048 * i),
        0,
        0.044 * shore,
        0.17 * r,
        surface - 0.25,
        0.65,
        tone(wood, 0.85 + 0.19 * noise(420 + i)),
        4,
      )
    for (const sign of [-1, 1]) {
      block(shore * 0.99, sign * r * 0.075, r * 0.034, r * 0.035, -r * 0.14, r * 0.23, iron, 2)
      block(shore * 0.68, sign * r * 0.12, r * 0.065, r * 0.063, surface, r * 0.074, wood, 4)
    }
  }
  const strip = Array.from({ length: 12 }, (_, i) =>
    orient((-0.49 + i * 0.046) * r, (0.36 + 0.035 * Math.sin(i * 0.44)) * r * wide, surface + 0.09),
  )
  for (let i = 0; i < strip.length - 1; i++) {
    const p = strip[i],
      q = strip[i + 1],
      t: Vertex = [q[0] + 0.03 * r * s, q[1] - 0.03 * r * c, q[2]],
      u: Vertex = [p[0] + 0.03 * r * s, p[1] - 0.03 * r * c, p[2]]
    face([u, t, q, p], tone(tint('leaf'), 0.83), 3)
    if (i % 2 === 0) {
      const h = 0.017 * r
      face(
        [
          [p[0] - h, p[1], p[2] + 0.13],
          [p[0], p[1] - h, p[2] + h],
          [p[0] + h, p[1], p[2] + 0.13],
          [p[0], p[1] + h, p[2]],
        ],
        tint('flower'),
        4,
      )
    }
  }
  const region = (slot: number) =>
    (isle.blend > 0.15 && slot === 1) || noise(450 + slot) < isle.blend ? isle.neighbor : isle.region
  function cluster(x: number, y: number, z: number, row: number, width: number, slot: number) {
    clusters.push({ at: orient(x * r, y * r * wide, z), region: region(slot), row, width: width * r })
  }
  const row = { village: 0, orchard: 1, yard: 1, relay: 2, shrine: 2, wild: 3 }[isle.kind]
  cluster(-0.14 + noise(465) * 0.07, -0.12, surface + terraceHeight, row, 1.16 + noise(466) * 0.09, 0)
  cluster(
    0.36,
    -0.08,
    surface,
    isle.kind === 'wild' ? 3 : isle.kind === 'village' ? 1 : 0,
    0.63 + 0.12 * noise(468),
    1,
  )
  cluster(-0.37, 0.34, surface, 3, 0.58 + 0.15 * noise(469), 2)
  if (isle.radius > 52) cluster(0.17, 0.36, surface, 3, 0.47, 3)
  return { faces, clusters }
}

function stampClusters(
  ctx: CanvasRenderingContext2D,
  model: Model,
  light: FlightLight,
  u: Vertex,
  v: Vertex,
  front: Vertex,
  scale: number,
) {
  const atlas = images.get('settlements')
  const clusters = [...model.clusters].sort((a, b) => dot(a.at, front) - dot(b.at, front))
  for (const item of clusters) {
    const x = dot(item.at, u),
      y = dot(item.at, v),
      w = item.width * scale
    ctx.save()
    ctx.translate(x + w * 0.055, y + w * 0.034)
    ctx.scale(w * 0.39, w * 0.093)
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    shadow.addColorStop(0, 'rgba(31,46,47,.37)')
    shadow.addColorStop(1, 'rgba(31,46,47,0)')
    ctx.fillStyle = shadow
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
    if (!atlas) {
      ctx.fillStyle = item.row === 3 ? palettes[item.region].leaf : palettes[item.region].trim
      ctx.beginPath()
      ctx.ellipse(x, y - w * 0.1, w * 0.18, w * 0.13, 0, 0, TAU)
      ctx.fill()
      continue
    }
    ctx.save()
    if (light.night > 0.02 || light.storm > 0.15)
      ctx.filter =
        'brightness(' +
        (1 - light.night * 0.46 - light.storm * 0.12) +
        ') saturate(' +
        (1 - light.night * 0.25) +
        ')'
    ctx.drawImage(
      atlas,
      PORT_IDS.indexOf(item.region) * 256,
      item.row * 256,
      256,
      256,
      x - w * 0.5,
      y - (w * 164) / 256,
      w,
      w,
    )
    ctx.restore()
  }
}

const models = new Map<string, Model>()
export function drawSkyIslets(
  c: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  project: Project,
  light: FlightLight,
) {
  loadPaints()
  const viewWidth = c.canvas.clientWidth || c.canvas.width,
    viewHeight = c.canvas.clientHeight || c.canvas.height
  for (const isle of skyIsletsNear(center, radius)) {
    const at = project(isle, 0),
      ex = project({ x: isle.x + 10, y: isle.y }, 0),
      ey = project({ x: isle.x, y: isle.y + 10 }, 0),
      ez = project(isle, 10)
    const u: Vertex = [(ex.x - at.x) * 0.1, (ey.x - at.x) * 0.1, (ez.x - at.x) * 0.1],
      v: Vertex = [(ex.y - at.y) * 0.1, (ey.y - at.y) * 0.1, (ez.y - at.y) * 0.1]
    const scale = Math.hypot(u[0], u[1])
    // Match the three-quarter harbor plates at the overhead limit. Deck and
    // mooring coordinates remain at their exact projected chart positions.
    v[2] = Math.min(v[2], -0.8 * scale)
    const margin = isle.radius * Math.max(1, scale, Math.hypot(...v)) * 1.8
    if (at.x < -margin || at.x > viewWidth + margin || at.y < -margin || at.y > viewHeight + margin) continue
    let model = models.get(isle.id)
    if (!model) {
      model = build(isle)
      if (models.size >= 80) models.delete(models.keys().next().value!)
      models.set(isle.id, model)
    }
    const stamp = [
      revision,
      ...[...u, ...v, light.night, light.dusk, light.storm, light.azimuth].map((n) => Math.round(n * 16)),
    ].join(',')
    if (model.sprite?.stamp !== stamp) {
      const front: Vertex = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      // Draw the surface beneath its structures; a close rim never erases the
      // upper half of a rooftop as the camera changes its approach angle.
      const visible = model.faces
        .filter((f) => dot(f.normal, front) > 0)
        .sort((a, b) => a.layer - b.layer || dot(a.center, front) - dot(b.center, front))
      const size = Math.ceil(2 * margin),
        density = Math.min(2, Math.max(1, c.canvas.width / viewWidth), 950 / size)
      const image = document.createElement('canvas')
      image.width = image.height = Math.ceil(size * density)
      const ctx = image.getContext('2d')!
      ctx.setTransform(density, 0, 0, density, margin * density, margin * density)
      const extent = isle.radius * scale
      for (const f of visible) {
        const shade =
          0.7 +
          0.43 *
            Math.max(
              -0.62,
              f.normal[0] * (-0.49 + 0.13 * light.azimuth) + f.normal[1] * 0.26 + f.normal[2] * 0.81,
            )
        const base = mix(tone(f.color, shade * (1 - 0.18 * light.storm)), [54, 71, 92], 0.52 * light.night)
        ctx.fillStyle = css(base)
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 0.32
        ctx.beginPath()
        f.points.forEach((p, i) => {
          const x = dot(p, u),
            y = dot(p, v)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        const tile = f.tile && images.get(f.tile)
        if (tile) {
          ctx.save()
          ctx.clip()
          const grass = f.tile === 'meadow',
            cliff = f.layer === 0
          // The original harbor albedos sit continuously across adjoining faces.
          // Multiply keeps local hue and the shaded sides visible through the paint.
          ctx.globalAlpha = (grass ? 0.68 : cliff ? 0.57 : 0.45) * (1 - light.night * 0.35)
          ctx.globalCompositeOperation = 'multiply'
          ctx.drawImage(tile, -extent * 1.15, -extent * 1.04, extent * 2.35, extent * (cliff ? 1.92 : 2.12))
          ctx.restore()
        }
      }
      stampClusters(ctx, model, light, u, v, front, scale)
      model.sprite = { image, left: -margin, top: -margin, stamp, density }
    }
    const sprite = model.sprite!
    c.drawImage(
      sprite.image,
      at.x + sprite.left,
      at.y + sprite.top,
      sprite.image.width / sprite.density,
      sprite.image.height / sprite.density,
    )
  }
}
