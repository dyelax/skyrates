import type { Point } from './battle-model'
import type { PortId } from './data'
import type { FlightLight } from './world-flight-light'
import { islandNoise, isletOutline, skyIsletsNear, type SkyIslet } from './world-islets'

type Vertex = [number, number, number]
type RGB = [number, number, number]
type Project = (point: Point, height: number) => Point
interface Face {
  points: Vertex[]
  color: RGB
  normal: Vertex
  center: Vertex
  lamp: boolean
}
const palette: Record<
  PortId,
  { soil: string; rock: string; grass: string; leaf: string; roof: string; wall: string; flower: string }
> = {
  sunstep: {
    soil: '#ba9664',
    rock: '#bfb6a0',
    grass: '#a0a063',
    leaf: '#779154',
    roof: '#bb7451',
    wall: '#ead7a4',
    flower: '#ebbd72',
  },
  glasshouse: {
    soil: '#a09e80',
    rock: '#9ca9a3',
    grass: '#94ac88',
    leaf: '#6c957d',
    roof: '#76a7a1',
    wall: '#ddd2ae',
    flower: '#b38fc3',
  },
  copperfall: {
    soil: '#ae7e61',
    rock: '#987d71',
    grass: '#999366',
    leaf: '#70865f',
    roof: '#a76648',
    wall: '#bca38a',
    flower: '#c69867',
  },
  meridian: {
    soil: '#9a9c9f',
    rock: '#8b929e',
    grass: '#c9d1c6',
    leaf: '#668981',
    roof: '#677f91',
    wall: '#e3dfcc',
    flower: '#dae3ea',
  },
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
const tone = (c: RGB, v: number): RGB => [c[0] * v, c[1] * v, c[2] * v]
const mul = (a: Vertex, b: Vertex) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const TAU = Math.PI * 2
function build(isle: SkyIslet) {
  const faces: Face[] = []
  const face = (points: Vertex[], color: RGB, lamp = false) => {
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
    if (n < 0.001) return
    const center: Vertex = [0, 0, 0]
    for (const p of points) {
      center[0] += p[0] / points.length
      center[1] += p[1] / points.length
      center[2] += p[2] / points.length
    }
    faces.push({ points, color, normal: [nx / n, ny / n, nz / n], center, lamp })
  }
  const r = isle.radius,
    primary = palette[isle.region],
    second = palette[isle.neighbor],
    noise = (s: number) => islandNoise(isle.seed, s)
  const tint = (k: keyof typeof primary) => mix(rgb(primary[k]), rgb(second[k]), isle.blend)
  const lip: Vertex[] = isletOutline(isle).map((p) => [p.x - isle.x, p.y - isle.y, 0])
  const turn = noise(6) * TAU,
    cs = Math.cos(turn),
    sn = Math.sin(turn),
    broad = 0.58 + 0.32 * noise(7)
  const pt = (x: number, y: number, z: number): Vertex => [x * cs - y * sn, x * sn + y * cs, z]
  const ring = (scale: number, alt: number, rough: number, salt: number) =>
    lip.map(([x, y], i): Vertex => {
      const s = scale + (noise(salt + i) - 0.5) * rough
      return [x * s, y * s, alt * r * (0.82 + noise(salt + 50 + i) * 0.34)]
    })
  const root = ring(0.39, -0.86 - noise(87) * 0.23, 0.24, 93),
    ledge = ring(0.88, -0.44, 0.13, 130),
    band = ring(0.98, -0.19, 0.045, 168)
  const crown = ring(0.77, 0.06, 0.03, 200)
  for (let i = 0; i < lip.length; i++) {
    const j = (i + 1) % lip.length
    for (const [low, high, col] of [
      [root, ledge, tone(tint('rock'), 0.72)],
      [ledge, band, tint('rock')],
      [band, lip, tint('soil')],
    ] as const) {
      const rock = tone(col, 0.8 + 0.3 * noise(240 + i))
      face([low[i], low[j], high[j]], rock)
      face([low[i], high[j], high[i]], tone(rock, 0.88 + 0.17 * noise(260 + i)))
    }
    face([lip[i], lip[j], crown[j], crown[i]], tone(tint('grass'), 0.9 + 0.15 * noise(i + 195)))
    face([crown[i], crown[j], [0, 0, r * 0.065]], tone(tint('grass'), 0.94 + 0.09 * noise(i + 207)))
  }
  const ground = r * 0.071
  // A low stone lip and irregular seams on the soil keep the village in scale.
  for (let i = 0; i < lip.length; i++) {
    const j = (i + 1) % lip.length
    if ((i + Math.floor(noise(681) * 5)) % 5 === 0) continue
    const top = lip[i],
      next = lip[j],
      under = band[i],
      other = band[j]
    const along = (a: Vertex, b: Vertex, t: number): Vertex => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]
    face(
      [
        along(top, under, 0.12),
        along(next, other, 0.17),
        along(next, other, 0.31),
        along(top, under, 0.28),
      ].reverse(),
      tone(tint('rock'), 1.04),
    )
  }
  if (isle.kind !== 'wild') {
    const track = rgb(isle.region === 'meridian' ? '#c8bfb0' : '#c6b693')
    const road = [
      [0.72, 0.04],
      [0.43, 0.1],
      [0.21, 0.07],
      [-0.08, -0.03],
      [-0.39, -0.17],
    ].map(([x, y]) => [x * r, y * r])
    for (let i = 1; i < road.length; i++) {
      const [x, y] = road[i - 1],
        [u, v] = road[i],
        edge = r * 0.034
      face(
        [
          pt(x, y - edge, ground + 0.29),
          pt(u, v - edge, ground + 0.29),
          pt(u, v + edge, ground + 0.29),
          pt(x, y + edge, ground + 0.29),
        ].reverse(),
        track,
      )
    }
  }

  function block(x: number, y: number, w: number, d: number, z: number, h: number, color: RGB) {
    const base = [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d],
    ].map(([a, b]) => pt(x + a * 0.5, y + b * 0.5, z))
    const top = base.map(([a, b]): Vertex => [a, b, z + h])
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      face([base[i], base[j], top[j], top[i]], color)
    }
    face(top, tone(color, 1.05))
  }
  function turret(x: number, y: number, rad: number, z: number, h: number, color: RGB, peak: number, n = 7) {
    const ring = (width: number, height: number) =>
      Array.from({ length: n }, (_, i) =>
        pt(x + width * Math.cos((i / n) * TAU), y + width * Math.sin((i / n) * TAU), height),
      )
    const lower = ring(rad, z),
      upper = ring(rad * peak, z + h)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      face([lower[i], lower[j], upper[j], upper[i]], color)
    }
    if (peak > 0) face(upper, color)
  }
  const branch = rgb('#807255'),
    stone = tint('rock')
  const tree = (x: number, y: number, size: number, region: PortId, salt: number) => {
    const pal = palette[region],
      leaf = rgb(pal.leaf)
    turret(x, y, size * 0.13, ground, size * 0.58, branch, 0.75, 5)
    if (region === 'meridian') {
      turret(x, y, size * 0.56, ground + size * 0.32, size * 0.95, leaf, 0.04, 6)
      turret(x, y, size * 0.4, ground + size * 0.71, size * 0.78, rgb('#b8c9bf'), 0.06, 6)
    } else {
      turret(x, y, size * 0.3, ground + size * 0.35, size * 0.31, leaf, 1.95, 7)
      turret(
        x,
        y,
        size * 0.59,
        ground + size * 0.66,
        size * 0.59,
        tone(leaf, 1.04 + noise(salt) * 0.12),
        0.4,
        7,
      )
      if (region === 'glasshouse')
        turret(
          x + 0.16 * size,
          y - 0.14 * size,
          size * 0.41,
          ground + size * 0.7,
          size * 0.37,
          rgb(pal.flower),
          0.68,
          6,
        )
    }
  }
  function home(x: number, y: number, s: number, region: PortId) {
    const pal = palette[region],
      w = s * 1.45,
      d = s,
      z = ground + s * 0.7
    block(x, y, w, d, ground, s * 0.7, rgb(pal.wall))
    if (region === 'meridian') {
      // A round dome on a square instrument house, crowned by a sighting finial.
      block(x, y, w * 1.11, d * 1.12, z, 0.13 * s, rgb('#f0e5d1'))
      turret(x, y, s * 0.64, z + s * 0.12, s * 0.35, rgb('#698a98'), 0.85, 10)
      turret(x, y, s * 0.54, z + s * 0.47, s * 0.26, rgb('#90a6a7'), 0.38, 10)
      turret(x, y, s * 0.1, z + s * 0.72, s * 0.28, rgb('#bdad80'), 0.03, 6)
    } else if (region === 'copperfall') {
      // An industrial sawtooth roof has two raised northern lights and a fitted flue.
      for (let i = 0; i < 2; i++) {
        const yy = y - d * 0.5 + i * d * 0.5
        face(
          [
            pt(x - w * 0.54, yy, z + s * 0.1),
            pt(x + w * 0.54, yy, z + s * 0.1),
            pt(x + w * 0.54, yy + d * 0.47, z + s * 0.42),
            pt(x - w * 0.54, yy + d * 0.47, z + s * 0.42),
          ],
          rgb(pal.roof),
        )
        face(
          [
            pt(x - w * 0.54, yy + d * 0.47, z + s * 0.42),
            pt(x + w * 0.54, yy + d * 0.47, z + s * 0.42),
            pt(x + w * 0.54, yy + d * 0.47, z + s * 0.09),
            pt(x - w * 0.54, yy + d * 0.47, z + s * 0.09),
          ],
          rgb('#718f91'),
        )
      }
      turret(x - w * 0.31, y - d * 0.28, s * 0.18, z, s * 0.78, rgb('#78665c'), 0.75, 6)
      turret(x - w * 0.31, y - d * 0.28, s * 0.17, z + s * 0.71, s * 0.09, rgb('#aaa28b'), 0.95, 6)
    } else if (region === 'glasshouse') {
      // Three translucent-looking glazed bays with opaque brass ribs.
      const roof = rgb(pal.roof),
        rib = rgb('#bcaf79'),
        n = 6
      for (let k = 0; k < n; k++) {
        const a = (k * Math.PI) / n,
          b = ((k + 1) * Math.PI) / n
        const arch = (side: number, t: number) =>
          pt(x + side * w * 0.51, y + Math.cos(t) * d * 0.55, z + Math.sin(t) * d * 0.56)
        face([arch(-1, a), arch(-1, b), arch(1, b), arch(1, a)], tone(roof, 0.82 + 0.25 * Math.sin(a)))
        for (const u of [-1 / 3, 1 / 3])
          face([arch(u, a), arch(u, b), arch(u + 0.05, b), arch(u + 0.05, a)], rib)
      }
    } else {
      const roof = rgb(pal.roof),
        peak = z + s * 0.48
      for (const side of [-1, 1]) {
        const poly = [
          pt(x - w * 0.58, y, z + s * 0.48),
          pt(x + w * 0.58, y, z + s * 0.48),
          pt(x + w * 0.58, y + side * d * 0.59, z),
          pt(x - w * 0.58, y + side * d * 0.59, z),
        ]
        face(side > 0 ? poly : poly.reverse(), roof)
      }
      for (const side of [-1, 1]) {
        const end = [
          pt(x + side * w * 0.5, y + d * 0.5, z),
          pt(x + side * w * 0.5, y - d * 0.5, z),
          pt(x + side * w * 0.5, y, peak),
        ]
        face(side > 0 ? end.reverse() : end, rgb(pal.wall))
      }
    }
    const window = [
      pt(x - w * 0.21, y + d * 0.505, ground + s * 0.28),
      pt(x + w * 0.14, y + d * 0.505, ground + s * 0.28),
      pt(x + w * 0.14, y + d * 0.505, ground + s * 0.57),
      pt(x - w * 0.21, y + d * 0.505, ground + s * 0.57),
    ]
    face(window.reverse(), rgb('#f2c579'), true)
  }
  const style = (slot: number) =>
    (isle.blend > 0.18 && slot === 1) || noise(600 + slot) < isle.blend ? isle.neighbor : isle.region
  const s = r * (0.2 + noise(610) * 0.05),
    family = style(0)
  if (isle.kind !== 'wild') {
    home(-0.13 * r, 0.02 * r, s * 1.12, family)
    if (isle.kind !== 'shrine') home(0.26 * r, -0.12 * r, s * 0.75, style(1))
    if (isle.kind === 'village') home(0.02 * r, 0.26 * r * broad, s * 0.67, style(2))
    if (family === 'sunstep' && ['orchard', 'village', 'shrine'].includes(isle.kind)) {
      const x = -0.34 * r,
        y = -0.02 * r,
        h = ground + s * 1.12
      turret(x, y, s * 0.33, ground, s * 1.2, rgb('#e2c898'), 0.7)
      turret(x, y, s * 0.33, h, s * 0.36, rgb('#96694e'), 0.04)
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4 + 0.37,
          dx = Math.cos(a),
          dz = Math.sin(a),
          plane = y + s * 0.28
        const blade = (along: number, across: number) =>
          pt(x + s * (dx * along - dz * across), plane, h + s * (dz * along + dx * across))
        const pts = [blade(0.08, 0), blade(0.84, 0), blade(0.84, 0.21), blade(0.34, 0.15)]
        face(pts, rgb('#ede3c3'))
        face([...pts].reverse(), rgb('#daca9f'))
      }
    }
  }
  if (isle.kind === 'orchard' || isle.kind === 'village') {
    for (let i = 0; i < (isle.kind === 'orchard' ? 8 : 4); i++) {
      const x = (0.18 * (i % 4) - 0.34) * r,
        y = (0.25 + 0.17 * Math.floor(i / 4)) * r * broad
      tree(x, y, s * 0.66, style(i % 3), 688 + i)
    }
  } else if (isle.kind === 'yard') {
    block(0.12 * r, 0.12 * r, r * 0.33, r * 0.09, ground, s * 0.25, rgb('#91775b'))
    turret(-0.3 * r, -0.12 * r, r * 0.053, ground, r * 0.36, stone, 0.7)
    turret(-0.3 * r, -0.12 * r, r * 0.064, ground + r * 0.33, r * 0.045, rgb('#8a644e'), 0.94)
    block(0.31 * r, -0.05 * r, s * 0.15, s * 0.17, ground, s * 1.75, rgb('#857861'))
    block(0.27 * r, -0.05 * r, s * 1.2, s * 0.12, ground + s * 1.63, s * 0.12, rgb('#bc9d60'))
  } else if (isle.kind === 'relay' || isle.kind === 'shrine') {
    const x = 0.12 * r,
      y = 0.04 * r,
      h = (isle.kind === 'relay' ? 0.47 : 0.31) * r
    turret(x, y, s * 0.45, ground, h, stone, 0.7)
    turret(x, y, s * 0.41, ground + h, s * 0.32, rgb('#f2cc80'), 0.92)
    turret(x, y, s * 0.55, ground + h + s * 0.32, s * 0.39, rgb(palette[family].roof), 0.04)
  }
  if (isle.kind !== 'orchard')
    for (let i = 0; i < (isle.kind === 'wild' ? 8 : 3); i++) {
      const a = (TAU * i) / 8 + noise(710 + i) * 0.24,
        spread = (isle.kind === 'wild' ? 0.44 : 0.53) * r
      tree(
        Math.cos(a) * spread,
        Math.sin(a) * spread * broad,
        r * (0.1 + 0.12 * noise(720 + i)),
        style(i % 3),
        730 + i,
      )
    }
  return faces
}

interface Sprite {
  bitmap: HTMLCanvasElement
  left: number
  top: number
  stamp: string
  density: number
}
const models = new Map<string, { faces: Face[]; sprite?: Sprite }>()
export function drawSkyIslets(
  c: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  project: Project,
  light: FlightLight,
) {
  const viewWidth = c.canvas.clientWidth || c.canvas.width,
    viewHeight = c.canvas.clientHeight || c.canvas.height
  for (const isle of skyIsletsNear(center, radius)) {
    const at = project(isle, 0)
    const ex = project({ x: isle.x + 10, y: isle.y }, 0),
      ey = project({ x: isle.x, y: isle.y + 10 }, 0),
      ez = project(isle, 10)
    const u: Vertex = [(ex.x - at.x) * 0.1, (ey.x - at.x) * 0.1, (ez.x - at.x) * 0.1],
      v: Vertex = [(ex.y - at.y) * 0.1, (ey.y - at.y) * 0.1, (ez.y - at.y) * 0.1]
    // At the chart's overhead limit, retain the readable hanging scarp and roof
    // elevation of an oblique chart illustration. The sea-level lip stays exact.
    v[2] = Math.min(v[2], -0.71 * Math.hypot(u[0], u[1]))
    const margin = isle.radius * Math.max(1, Math.hypot(...u), Math.hypot(...v)) * 1.5
    if (at.x < -margin || at.x > viewWidth + margin || at.y < -margin || at.y > viewHeight + margin) continue
    let model = models.get(isle.id)
    if (!model) {
      model = { faces: build(isle) }
      if (models.size >= 80) models.delete(models.keys().next().value!)
      models.set(isle.id, model)
    }
    const stamp = [...u, ...v, light.night, light.dusk, light.storm, light.azimuth]
      .map((n) => Math.round(n * 16))
      .join(',')
    if (model.sprite?.stamp !== stamp) {
      const front: Vertex = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const visible = model.faces
        .filter((f) => mul(f.normal, front) > 0)
        .sort((a, b) => mul(a.center, front) - mul(b.center, front))
      let minX = 0,
        minY = 0,
        maxX = 0,
        maxY = 0
      for (const f of visible)
        for (const vert of f.points) {
          const x = mul(vert, u),
            y = mul(vert, v)
          minX = Math.min(x, minX)
          minY = Math.min(y, minY)
          maxX = Math.max(x, maxX)
          maxY = Math.max(y, maxY)
        }
      const left = Math.floor(minX) - 1,
        top = Math.floor(minY) - 1,
        w = Math.ceil(maxX) - left + 2,
        h = Math.ceil(maxY) - top + 2
      const density = Math.min(2, Math.max(1, c.canvas.width / viewWidth), 900 / Math.max(w, h))
      const bitmap = document.createElement('canvas')
      bitmap.width = Math.ceil(density * w)
      bitmap.height = Math.ceil(density * h)
      const ctx = bitmap.getContext('2d')!
      ctx.setTransform(density, 0, 0, density, -left * density, -top * density)
      for (const f of visible) {
        const shade =
          0.72 +
          0.42 *
            Math.max(
              -0.65,
              f.normal[0] * (-0.45 + 0.2 * light.azimuth) + f.normal[1] * 0.24 + f.normal[2] * 0.83,
            )
        const color = f.lamp
          ? mix(f.color, [255, 188, 91], light.night)
          : mix(tone(f.color, shade * (1 - 0.19 * light.storm)), [50, 67, 88], 0.6 * light.night)
        // Fill very fine seams between touching painter-sorted rock triangles.
        ctx.fillStyle = 'rgb(' + color.map((n) => Math.round(n)).join(',') + ')'
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 0.3
        ctx.beginPath()
        f.points.forEach((vert, i) => {
          const x = mul(vert, u),
            y = mul(vert, v)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      model.sprite = { bitmap, left, top, stamp, density }
    }
    const sprite = model.sprite!,
      density = sprite.density
    c.drawImage(
      sprite.bitmap,
      at.x + sprite.left,
      at.y + sprite.top,
      sprite.bitmap.width / density,
      sprite.bitmap.height / density,
    )
  }
}
