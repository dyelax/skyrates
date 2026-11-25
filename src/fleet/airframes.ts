import type { Gun } from '../battle-model'

type Vec = [number, number, number]
type UV = [number, number]
type Shade = [number, number, number]
type Mul = (point: Vec) => Vec
type Surface = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Livery = 'wayfarer' | 'watch' | 'wasp'
export const FLOATS_PER_VERTEX = 16
const origin: Vec = [0, 0, 0]
const timber = 0,
  metal = 1,
  cloth = 2,
  light = 7
const white = '#ffffff'
const color = (hex: string): Shade => {
  const rgb = Number.parseInt(hex.slice(1), 16)
  return [(rgb >> 16) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255]
}
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
function unit(p: Vec): Vec {
  const l = Math.hypot(...p) || 1
  return [p[0] / l, p[1] / l, p[2] / l]
}

interface Finish {
  color: string
  surface: Surface
  motion?: number
  pivot?: Vec
}
const paint = (tint: string, surface: Surface = timber, motion = 0, pivot: Vec = origin): Finish => ({
  color: tint,
  surface,
  motion,
  pivot,
})
const brass = paint('#e5a750', metal),
  rope = paint('#543f36', cloth),
  gunmetal = paint('#384b50', metal)
const uv: UV[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]
class Builder {
  vertices: number[] = []
  triangle(a: Vec, b: Vec, c: Vec, finish: Finish, tex: UV[] = uv) {
    const n = unit(cross(sub(b, a), sub(c, a)))
    const rgb = color(finish.color)
    for (const [i, v] of [a, b, c].entries())
      this.vertices.push(
        ...v,
        ...n,
        ...rgb,
        ...tex[i],
        finish.surface,
        finish.motion ?? 0,
        ...(finish.pivot ?? origin),
      )
  }
  quad(a: Vec, b: Vec, c: Vec, d: Vec, f: Finish, tex: UV[] = uv) {
    this.triangle(a, b, c, f, [tex[0], tex[1], tex[2]])
    this.triangle(a, c, d, f, [tex[0], tex[2], tex[3]])
  }
  solid(w: number, h: number, d: number, f: Finish, local: Mul) {
    const p: Vec[] = []
    for (const y of [-h / 2, h / 2])
      for (const z of [-d / 2, d / 2]) for (const x of [-w / 2, w / 2]) p.push(local([x, y, z]))
    for (const [a, b, c, e] of [
      [4, 6, 7, 5],
      [0, 1, 3, 2],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [1, 5, 7, 3],
      [0, 2, 6, 4],
    ])
      this.quad(p[a], p[b], p[c], p[e], f)
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, f: Finish) {
    this.solid(w, h, d, f, (p) => [x + p[0], y + p[1], z + p[2]])
  }
  beam(a: Vec, b: Vec, width: number, finish: Finish, depth = width) {
    const delta = sub(b, a),
      dir = unit(delta)
    const side = unit(cross(dir, Math.abs(dir[1]) > 0.91 ? [0, 0, 1] : [0, 1, 0]))
    const up = cross(side, dir)
    this.solid(Math.hypot(...delta), width, depth, finish, (p) => [
      (a[0] + b[0]) / 2 + dir[0] * p[0] + up[0] * p[1] + side[0] * p[2],
      (a[1] + b[1]) / 2 + dir[1] * p[0] + up[1] * p[1] + side[1] * p[2],
      (a[2] + b[2]) / 2 + dir[2] * p[0] + up[2] * p[1] + side[2] * p[2],
    ])
  }
  data() {
    return new Float32Array(this.vertices)
  }
}

const liveries = {
  wayfarer: { hull: '#583d31', deck: '#dca36c', trim: '#3e8990', sail: 3 as Surface, lamp: '#b7f7d0' },
  watch: { hull: '#3b4f5c', deck: '#c0a27c', trim: '#e4b559', sail: 5 as Surface, lamp: '#b9e8ff' },
  wasp: { hull: '#423332', deck: '#bd8661', trim: '#a34e38', sail: 4 as Surface, lamp: '#ffac62' },
}

function solarPanel(
  b: Builder,
  x: number,
  height: number,
  span: number,
  reach: number,
  surface: Surface,
  sign: number,
) {
  // A bellied, two-sided sail cut from trapezoidal gores. Each corner is a real point in the rig.
  const root: Vec = [x, height, 0]
  const f = paint(white, surface, 2, root)
  const point = (u: number, v: number): Vec => [
    x + (u - 0.54) * (reach * (1 - v * 0.48)) - 7.5 * v,
    height - v * (9 + 2 * u) - 1.3 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI),
    sign * (0.8 + span * v + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 1.6),
  ]
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      const u = col / 6,
        v = row / 4,
        uu = (col + 1) / 6,
        vv = (row + 1) / 4
      b.quad(point(u, v), point(uu, v), point(uu, vv), point(u, vv), f, [
        [u, v],
        [uu, v],
        [uu, vv],
        [u, vv],
      ])
    }
  // Spars and hem move with the fabric as the crew reefs it before boarding.
  for (const row of [0, 0.52, 1])
    b.beam(point(0, row), point(1, row), row === 0 ? 0.75 : 0.35, paint('#a77946', metal, 2, root))
  for (const u of [0, 1]) b.beam(point(u, 0), point(u, 1), 0.38, paint('#d0ad76', cloth, 2, root))
}

export function buildAirframe(livery: Livery, guns: Pick<Gun, 'side' | 'station'>[]): Float32Array {
  const b = new Builder(),
    p = liveries[livery]
  const dark = paint(p.hull),
    rail = paint(p.trim, metal),
    deck = paint(p.deck)
  const stern = livery === 'wasp' ? -35 : -39
  // A curved hull assembled from timber strakes. The raised bow remains sharp at any compass heading.
  const stations: [number, number, number][] = [
    [stern, 5.4, 2],
    [-32, 9.1, 1.6],
    [-20, 11.4, 0.7],
    [-5, 12, 0],
    [12, 11.9, 0],
    [27, 8.8, 0.8],
    [38, 4, 2.2],
    [44, 0.45, 3.4],
  ]
  for (let i = 0; i < stations.length - 1; i++) {
    const [x, w, y] = stations[i],
      [xx, ww, yy] = stations[i + 1]
    b.quad([x, y, -w], [x, y, w], [xx, yy, ww], [xx, yy, -ww], deck)
    for (const sign of [-1, 1]) {
      let old: Vec = [x, y, sign * w],
        next: Vec = [xx, yy, sign * ww]
      for (const [scale, down, finish] of [
        [1, -1.1, brass],
        [0.97, -2.8, rail],
        [0.82, -5.9, dark],
        [0.55, -8.3, dark],
        [0.05, -10.8, rail],
      ] as const) {
        const lower: Vec = [x, y + down, sign * w * scale],
          end: Vec = [xx, yy + down, sign * ww * scale]
        b.quad(old, next, end, lower, finish)
        old = lower
        next = end
      }
      b.beam([x, y + 1.7, sign * w], [xx, yy + 1.7, sign * ww], 0.6, brass)
      b.box(x, y + 0.8, sign * w, 0.65, 2, 0.65, rail)
    }
    // Deck boards and brass eyes give an overhead bearing without covering the cannon mounts.
    for (let x0 = x + 1.5; x0 < xx; x0 += 3) {
      const t = (x0 - x) / (xx - x),
        wy = w + (ww - w) * t,
        y0 = y + (yy - y) * t
      b.box(x0, y0 + 0.08, 0, 0.18, 0.12, wy * 1.91, paint('#946b4f'))
    }
  }
  b.box(stern, 0, 0, 1.3, 4, 10, dark)
  b.beam([-35, -7, 0], [33, -7, 0], 2.1, paint(p.lamp, light))
  b.beam([27, 3, 0], [50, 7.4, 0], 1.25, brass)
  b.beam([48, 7, 0], [10, 21, 0], 0.38, rope)
  const cabinX = stern + 8
  b.box(cabinX, 3.25, 0, 11.6, 5.5, 13.8, dark)
  b.box(cabinX, 6.4, 0, 13.1, 1, 15.5, rail)
  for (const sign of [-1, 1])
    for (let n = 0; n < 3; n++)
      b.box(cabinX - 3.4 + n * 3.35, 3.8, sign * 7, 2.5, 2, 0.24, paint('#ffb967', light))
  b.box(cabinX + 1, 7.2, 0, 7, 0.7, 8, deck)
  // Little roofs, gratings and navigation lamps stay legible when the wings fold away.
  b.quad([cabinX - 2.8, 7.65, -3], [cabinX + 4, 7.65, -3], [cabinX + 4, 7.65, 3],
    [cabinX - 2.8, 7.65, 3], paint(white, 6))
  for (const x of [-22, 2, 26]) {
    b.box(x, 0.96, 0, 5, 1.7, 5.6, dark)
    for (let grate = -2; grate <= 2; grate += 1)
      b.box(x + grate, 1.87, 0, 0.31, 0.33, 4.7, brass)
  }
  for (const side of [-1, 1]) {
    b.box(20, 2.1, side * 10, 2.3, 1.5, 1.9, gunmetal)
    b.box(20, 3.1, side * 10, 1.55, 1.45, 1.45, paint(side < 0 ? '#e78768' : '#94e8bb', light))
    if (livery === 'wasp') {
      b.beam([-28, -0.2, side * 6.8], [-41, 4, side * 11.2], 1.4, rail)
      b.triangle([-40, 4, side * 11.2], [-27, 0.7, side * 6.7], [-32, 0.5, side * 5.8], rail)
    } else if (livery === 'watch') {
      b.box(-32.2, 9, side * 4.8, 2.4, 3.4, 2.1, gunmetal)
      b.box(-32.2, 10.9, side * 4.8, 2.8, 0.5, 2.5, brass)
    }
    const z = side * 15.7
    b.beam([-25, -2, side * 6], [-26, 1.4, z], 1.8, rail)
    b.box(-26, 1.7, z, 4.8, 2.2, 4.5, gunmetal)
    const pivot: Vec = [-26, 3.3, z]
    for (const [w, d] of [
      [10.8, 1.35],
      [1.35, 10.8],
    ])
      b.box(...pivot, w, 0.48, d, paint('#d9b482', metal, 1, pivot))
    b.box(-26, 3.95, z, 1.7, 1.2, 1.7, brass)
  }
  for (const [x, h, span, reach] of livery === 'wasp'
    ? [
        [-10, 21, 13, 25],
        [13, 17, 9, 18],
      ]
    : [
        [-9, 26, 15, 27],
        [14, 21, 11, 21],
      ]) {
    b.beam([x, 1, 0], [x, h + 4, 0], 1, brass)
    b.box(x, 2, 0, 4.5, 2, 4.5, rail)
    for (const side of [-1, 1]) {
      solarPanel(b, x, h, span, reach, p.sail, side)
      b.beam([x, h, 0], [x - 7, 1, side * 9], 0.37, rope)
      b.beam([x, h + 1, 0], [x + 8, 1, side * 8], 0.3, rope)
    }
    b.triangle([x, h + 3.6, 0], [x - 7, h + 3, 0.7], [x, h + 1.2, 0], paint(p.trim, cloth))
  }
  for (const gun of guns) {
    const z = gun.side === 'port' ? -1 : 1,
      x = gun.station === 0 ? 11 : -12
    const index = gun.station * 2 + (z < 0 ? 0 : 1)
    b.box(x, 1.15, z * 9, 4, 1.5, 5, paint('#653c2e'))
    for (const dx of [-1.7, 1.7]) b.box(x + dx, 1.3, z * 8, 0.8, 1.1, 3.6, gunmetal)
    const recoil = 3 + index,
      pivot: Vec = [x, 2.8, z]
    b.beam([x, 2.6, z * 6], [x, 3.3, z * 14.6], 2.2, paint('#42595c', metal, recoil, pivot))
    b.box(x, 3.3, z * 13.7, 2.7, 2.7, 1, paint('#d4a650', metal, recoil, pivot))
    b.box(x, 3.3, z * 14.2, 1.48, 1.48, 0.95, paint('#23292b', metal, recoil, pivot))
  }
  return b.data()
}

export function buildHand(enemy: boolean): Float32Array {
  const b = new Builder()
  const coat = paint(enemy ? '#a74e3e' : '#418989', cloth),
    trousers = paint('#37434c', cloth),
    skin = paint(enemy ? '#b97b56' : '#c79773', cloth)
  const limb = (z: number, leg: boolean) =>
    paint(leg ? trousers.color : coat.color, cloth, (leg ? 7 : 9) + (z > 0 ? 1 : 0), [0, leg ? 2.7 : 4.6, z])
  b.box(0, 3.6, 0, 2.1, 2.35, 2.4, coat)
  b.box(0.15, 5.55, 0, 1.65, 1.6, 1.7, skin)
  b.box(0.05, 6.4, 0, 2.1, 0.5, 2.12, paint(enemy ? '#753d35' : '#e8d7a6', cloth))
  for (const z of [-0.62, 0.62]) {
    b.box(0, 1.6, z, 0.9, 2.25, 0.82, limb(z, true))
    b.box(0.32, 0.55, z, 1.4, 0.62, 0.85, paint('#373437', timber, limb(z, true).motion, limb(z, true).pivot))
    const sleeve = limb(z * 2.25, false)
    b.box(0.2, 3.78, z * 2.25, 0.79, 1.8, 0.74, sleeve)
    b.box(0.35, 2.79, z * 2.25, 0.66, 0.71, 0.67, paint(skin.color, cloth, sleeve.motion, sleeve.pivot))
    if (z > 0) b.beam([0.35, 2.78, z * 2.25], [2.3, 3.6, z * 2.45], 0.32,
      paint('#e8d6ab', metal, sleeve.motion, sleeve.pivot))

  }
  return b.data()
}


export const GANGWAY_LENGTH = 28
/** Two narrow gangways unfold along the paths already used by the boarding party. */
export function buildGangway(): Float32Array {
  const b = new Builder()
  for (const side of [-1, 1])
    b.box(GANGWAY_LENGTH / 2, 0, side * 2.4, GANGWAY_LENGTH, 0.65, 0.55, gunmetal)
  for (let step = 0; step < 10; step++) {
    const width = GANGWAY_LENGTH / 10
    b.box((step + 0.5) * width, 0.46, 0, width - 0.19, 0.55, 5.5,
      paint(step % 2 ? '#c69b68' : '#b98b5a'))
  }
  return b.data()
}
