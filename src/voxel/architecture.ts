import * as T from 'three'
import { Blocks, palette as p, random, pick, type V3 } from './blocks'

const stoneTones = ['#dfc394', '#d0b68b', '#c1a583', '#e6caa1', '#d9b890']
const roofTones = ['#568478', '#487c72', '#739687', '#4c736d', '#759a87']
const leaves = ['#365c47', '#63804d', '#83904b', '#a7a958', '#58764a', '#93a35b']

export function masonry(b: Blocks, x: number, z: number, w: number, h: number, d: number, seed: number, base = 0) {
  const r = random(seed)
  b.box(x, base + h / 2, z, w, h, d, p.cream)
  // Projecting quoins and stepped stone courses catch sunlight around every corner.
  for (let y = 0.26; y < h; y += 0.5)
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        const alt = Math.floor(y * 2) % 2 === 0
        b.box(
          x + side * (w * 0.5 - 0.15),
          base + y,
          z + end * (d * 0.5 - 0.13),
          alt ? 0.68 : 0.43,
          0.46,
          alt ? 0.42 : 0.65,
          pick(stoneTones, r),
        )
      }
  for (let row = 0; row < Math.ceil(h * 1.4); row++)
    for (let col = 0; col < w * 1.1; col++) {
      const px = x - w / 2 + col * 0.93 + (row % 2) * 0.37
      if (px + 0.65 > x + w / 2 || r() > 0.32) continue
      b.box(px + 0.32, base + row * 0.66 + 0.24, z + d / 2 + 0.012, 0.66, 0.27, 0.04, pick(stoneTones, r))
    }
  b.box(x, base + 0.17, z, w + 0.27, 0.35, d + 0.27, '#b09a80')
  b.box(x, base + h - 0.08, z, w + 0.24, 0.23, d + 0.23, '#bd9b73')
}
export function hipRoof(
  b: Blocks,
  x: number,
  base: number,
  z: number,
  w: number,
  d: number,
  height: number,
  colors = roofTones,
) {
  const steps = Math.max(6, Math.round(height * 4)),
    r = random(Math.abs(Math.round(x * 774 + z * 658 + 710)))
  for (let i = 0; i < steps; i++) {
    const t = i / steps,
      ww = w * (1 - 0.78 * t),
      dd = d * (1 - 0.94 * t),
      y = base + (i * height) / steps
    b.box(x, y, z, ww, height / steps + 0.04, dd, pick(colors, r), 'copper')
    const n = Math.ceil(ww / 0.66)
    for (let k = 0; k < n; k++)
      for (const s of [-1, 1]) {
        b.box(
          x + ((k + 0.5) * ww) / n - ww / 2,
          y + 0.04,
          z + (s * dd) / 2,
          ww / n - 0.035,
          (height / steps) * 0.7,
          0.095,
          pick(colors, r),
          'copper',
        )
      }
  }
  b.box(x, base + height, z, w * 0.24, 0.18, 0.42, p.brass, 'copper')
}
export function dome(b: Blocks, x: number, y: number, z: number, radius: number, tall: number, glass = false) {
  const r = random(Math.round((x + z + 95) * 123)),
    cell = radius / 11
  for (let ix = -11; ix <= 11; ix++)
    for (let iz = -11; iz <= 11; iz++) {
      const rad = Math.hypot(ix, iz) / 11
      if (rad > 1) continue
      const h = Math.max(0.25, Math.round((Math.sqrt(1 - rad * rad) * tall) / 0.19) * 0.19)
      const rib = Math.abs(ix) < 0.6 || Math.abs(iz) < 0.6 || Math.abs(Math.abs(ix) - Math.abs(iz)) < 0.6
      const colors = glass ? ['#8bc9b3', '#93c8b3', '#6ab7af', '#a4cebb'] : roofTones
      // Each stepped tile closes the drop to its outward neighbour.
      const out = Math.min(1, (Math.hypot(ix, iz) + 1.44) / 11)
      const lower = Math.sqrt(Math.max(0, 1 - out * out)) * tall
      const thickness = Math.max(0.24, h - lower + 0.15)
      b.box(
        x + ix * cell,
        y + h - thickness / 2,
        z + iz * cell,
        cell + 0.01,
        thickness,
        cell + 0.01,
        rib ? p.brass : pick(colors, r),
        rib ? 'copper' : glass ? 'glass' : 'copper',
      )
    }
  b.box(x, y + tall + 0.4, z, 0.13, 0.8, 0.13, p.brass, 'copper')
}
export function windowBay(b: Blocks, x: number, y: number, z: number, w = 1.05, h = 1.5, light = false) {
  b.box(x, y, z, w + 0.2, h + 0.16, 0.22, '#8c7358')
  b.box(x, y, z + 0.13, w, h, 0.1, light ? '#e7ae6b' : '#53878a', light ? 'lamp' : 'glass')
  for (const offset of [-0.48, 0, 0.48])
    b.box(x + offset * w, y, z + 0.2, 0.075, h + 0.07, 0.08, '#6b6654', 'timber')
  for (const offset of [-0.48, 0.12, 0.48])
    b.box(x, y + offset * h, z + 0.2, w + 0.1, 0.07, 0.08, '#7d6952', 'timber')
  b.box(x, y - h * 0.5 - 0.11, z + 0.08, w + 0.36, 0.15, 0.48, '#b19576')
}
export function door(b: Blocks, x: number, z: number, w = 1.84, base = 0) {
  b.box(x, base + 1.28, z, w + 0.35, 2.58, 0.27, '#ae9172')
  b.box(x, base + 1.17, z + 0.17, w, 2.35, 0.18, '#3c655e', 'timber')
  for (const side of [-1, 1]) {
    b.box(x + side * w * 0.23, base + 1.65, z + 0.28, w * 0.39, 0.67, 0.07, '#54827b', 'glass')
    b.box(x + side * w * 0.23, base + 0.6, z + 0.28, w * 0.36, 0.61, 0.06, '#4a7364', 'timber')
  }
  b.box(x + 0.22, base + 1.02, z + 0.36, 0.09, 0.21, 0.07, p.brass, 'copper')
  for (let i = 0; i < 9; i++) {
    const a = ((i + 0.5) / 9) * Math.PI
    b.box(
      x + Math.cos(a) * (w * 0.56),
      base + 2.31 + Math.sin(a) * 0.5,
      z + 0.15,
      0.35,
      0.32,
      0.36,
      '#ddc29a',
      'plaster',
      0,
      0,
      a - Math.PI / 2,
    )
  }
}
export function lantern(b: Blocks, x: number, y: number, z: number, size = 1) {
  const s = size
  b.box(x, y - 0.22 * s, z, 0.4 * s, 0.1 * s, 0.39 * s, p.dark, 'iron')
  b.box(x, y + 0.22 * s, z, 0.45 * s, 0.1 * s, 0.43 * s, p.brass, 'copper')
  b.box(x, y, z, 0.27 * s, 0.4 * s, 0.26 * s, '#ffd490', 'lamp')
  for (const a of [-1, 1])
    for (const c of [-1, 1])
      b.box(x + a * 0.15 * s, y, z + c * 0.15 * s, 0.032 * s, 0.43 * s, 0.032 * s, p.dark, 'iron')
}
export function planter(b: Blocks, x: number, y: number, z: number, w: number, r: () => number) {
  b.box(x, y + 0.13, z, w, 0.3, 0.56, '#ab6b4c', 'plaster')
  for (let j = 0; j < w * 15; j++) {
    const xx = x + (r() - 0.5) * w,
      zz = z + (r() - 0.5) * 0.52,
      yy = y + 0.35 + r() * 0.32
    b.box(xx, yy, zz, 0.17, 0.27, 0.16, pick(leaves, r), 'leaf')
    if (r() > 0.6)
      b.box(xx, yy + 0.15, zz, 0.11, 0.12, 0.1, pick(['#e998a8', '#ac75a3', '#9568aa', '#dad195'], r), 'leaf')
  }
}
export function townhouse(
  b: Blocks,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  seed: number,
  night: boolean,
  roof = roofTones,
) {
  masonry(b, x, z, w, h, d, seed)
  hipRoof(b, x, h + 0.12, z, w + 0.72, d + 0.72, h * 0.38, roof)
  const front = z + d / 2
  door(b, x, front)
  for (const side of [-1, 1]) {
    windowBay(b, x + side * w * 0.31, 1.64, front, 1.03, 1.46, night)
    if (h > 4.4) windowBay(b, x + side * w * 0.3, h - 0.98, front, 1.0, 1.32, night)
    lantern(b, x + side * 1.28, 2.14, front + 0.3, 0.81)
    planter(b, x + side * w * 0.3, 0.38, front + 0.52, 1.38, random(seed + side))
  }
  if (h > 4.4) windowBay(b, x, h - 0.96, front, 1.15, 1.36, night)
}
export function barrel(b: Blocks, x: number, z: number, size = 0.72, y = 0) {
  for (let i = 0; i < 5; i++) {
    const w = size * [0.78, 0.91, 1, 0.91, 0.78][i]
    b.box(x, y + (i + 0.5) * size * 0.23, z, w, size * 0.23, w, p.oak, 'timber')
    if (i === 1 || i === 3) b.box(x, y + (i + 0.6) * size * 0.23, z, w + 0.03, 0.065, w + 0.03, '#596263', 'iron')
  }
}
export function crate(b: Blocks, x: number, z: number, w = 0.95, base = 0) {
  const sy = w * 0.68,
    sz = w * 0.8
  b.box(x, base + sy / 2, z, w, sy, sz, '#af8357', 'timber')
  for (const side of [-1, 1]) {
    for (const end of [-1, 1])
      b.box(
        x + side * (w / 2 - 0.05),
        base + sy / 2,
        z + (end * sz) / 2,
        0.11,
        sy + 0.08,
        0.11,
        '#72563d',
        'timber',
      )
    b.box(x, base + sy - 0.1, z + (side * sz) / 2, w, 0.11, 0.09, '#c99f71', 'timber')
    b.beam(
      [x - w * 0.39, base + 0.1, z + side * (sz / 2 + 0.018)],
      [x + w * 0.39, base + sy - 0.1, z + side * (sz / 2 + 0.018)],
      0.065,
      '#8c6443',
      'timber',
    )
  }
}
export function stall(
  b: Blocks,
  x: number,
  z: number,
  roof: string,
  goods: 'fruit' | 'glass' | 'iron' | 'silk',
  wide = 4.3,
) {
  const deep = 2.45
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      b.box(x + side * (wide * 0.46), 1.45, z + end * deep * 0.44, 0.14, 2.9, 0.14, '#76553a', 'timber')
  b.box(x, 0.74, z + 0.32, wide, 0.84, 0.95, '#886247', 'timber')
  b.box(x, 1.2, z + 0.32, wide + 0.2, 0.14, 1.14, '#cbac77', 'timber')
  for (let i = 0; i < 12; i++) {
    const color = i % 3 === 1 ? '#eed0a2' : roof
    const xx = x + ((i + 0.5) * wide) / 12 - wide / 2
    for (let j = 0; j < 6; j++) {
      const zz = z + (j - 2.5) * 0.55,
        yy = 3.02 - Math.abs(j - 2.5) * 0.145
      b.box(xx, yy, zz, wide / 12 + 0.01, 0.15, 0.59, color, 'canvas')
    }
    b.box(xx, 2.51, z + 1.62, wide / 12 - 0.012, 0.28 + (i % 3) * 0.035, 0.09, color, 'canvas')
  }
  const rand = random(Math.round((x + 30) * 77))
  for (let i = 0; i < 4; i++) {
    const xx = x + (i - 1.5) * wide * 0.225
    if (goods === 'fruit') {
      b.box(xx, 1.32, z + 0.36, wide * 0.2, 0.17, 0.69, '#73553e', 'timber')
      for (let k = 0; k < 28; k++) {
        const yy = k > 18 ? 1.59 : 1.48
        b.box(
          xx + (rand() - 0.5) * wide * 0.17,
          yy,
          z + 0.34 + (rand() - 0.5) * 0.55,
          0.15,
          0.16,
          0.145,
          pick(i % 2 ? ['#c47931', '#db9942', '#e3aa51'] : ['#b0a950', '#adb953', '#d4b455'], rand),
          'leaf',
        )
      }
    } else if (goods === 'glass') {
      for (let k = 0; k < 7; k++)
        b.box(
          xx + (rand() - 0.5) * 0.24,
          1.5 + k * 0.035,
          z + 0.32 + (rand() - 0.5) * 0.12,
          0.5,
          0.08,
          0.43,
          pick(['#8ac4b9', '#8bafbf', '#98caca'], rand),
          'glass',
        )
    } else {
      for (let k = 0; k < 3; k++)
        b.box(
          xx,
          1.38 + k * 0.135,
          z + 0.29,
          0.55,
          0.14,
          0.38,
          goods === 'iron' ? pick(['#686970', '#ac8b62'], rand) : pick(['#c98f94', '#759eac', '#c4b66b'], rand),
          goods === 'iron' ? 'iron' : 'canvas',
        )
    }
  }
}
export function tree(b: Blocks, x: number, z: number, h: number, seed: number, fruit = false, y = 0) {
  const r = random(seed)
  b.box(x, y + h * 0.26, z, h * 0.105, h * 0.52, h * 0.095, '#73513e', 'timber')
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4 + r() * 0.4,
      dx = Math.cos(a) * h * 0.23,
      dz = Math.sin(a) * h * 0.23
    b.beam([x, y + h * 0.31, z], [x + dx, y + h * 0.65, z + dz], h * 0.045, '#715238')
  }
  const s = h * 0.115
  for (let i = -3; i <= 3; i++)
    for (let j = -2; j <= 3; j++)
      for (let k = -3; k <= 3; k++) {
        const rad = (i * i) / 11 + (j * j) / 7 + (k * k) / 10
        if (rad > 0.93 + r() * 0.3) continue
        const xx = x + i * s,
          yy = y + h * 0.69 + j * s,
          zz = z + k * s
        b.box(
          xx,
          yy,
          zz,
          s * (1.03 + r() * 0.3),
          s * (1.1 + r() * 0.35),
          s * (1 + r() * 0.3),
          pick(leaves, r),
          'leaf',
        )
        if (fruit && rad > 0.66 && r() > 0.65)
          b.box(xx + s * 0.38, yy - 0.14, zz + s * 0.46, 0.16, 0.19, 0.16, '#dca34e', 'leaf')
      }
}
export function crane(b: Blocks, x: number, z: number, h = 6) {
  b.box(x, 0.32, z, 1.72, 0.65, 1.66, '#856f59')
  for (const s of [-1, 1])
    for (const d of [-1, 1]) b.box(x + s * 0.44, h / 2, z + d * 0.35, 0.18, h, 0.16, '#8a6844', 'timber')
  for (let i = 0; i < h; i += 1.3) {
    b.beam([x - 0.44, i, z + 0.36], [x + 0.44, i + 1.2, z + 0.36], 0.12, p.brass, 'copper')
    b.beam([x + 0.44, i, z - 0.36], [x - 0.44, i + 1.2, z - 0.36], 0.12, p.brass, 'copper')
  }
  b.beam([x - 2.8, h + 0.32, z], [x + 1.35, h + 0.32, z], 0.25, '#826449', 'timber')
  b.beam([x, h - 1.6, z], [x - 2.4, h + 0.24, z], 0.16, p.brass, 'copper')
  b.box(x - 2.63, h * 0.69, z, 0.045, h * 0.62, 0.045, '#514637', 'iron')
  b.box(x - 2.63, h * 0.39, z, 0.28, 0.2, 0.17, p.brass, 'copper')
}
export function pennants(b: Blocks, a: V3, c: V3, count: number, colors: string[]) {
  let prev = a
  for (let i = 1; i <= count; i++) {
    const u = i / count,
      cur: V3 = [
        a[0] + (c[0] - a[0]) * u,
        a[1] + (c[1] - a[1]) * u - Math.sin(u * Math.PI) * 0.75,
        a[2] + (c[2] - a[2]) * u,
      ]
    b.beam(prev, cur, 0.025, '#6e604c', 'timber')
    for (let j = 0; j < 3; j++)
      b.box(
        cur[0],
        cur[1] - 0.1 - j * 0.14,
        cur[2],
        0.42 - j * 0.11,
        0.14,
        0.065,
        colors[i % colors.length],
        'canvas',
        0,
        0.2,
        0.13,
      )
    prev = cur
  }
}
export function ship(materials: Blocks['materials']) {
  const group = new T.Group(),
    b = new Blocks(materials)
  // Sections taper at the bow and stern; the keel is an exposed strip of aether glass.
  for (let i = 0; i < 29; i++) {
    const u = (i - 14) / 14,
      ww = Math.max(0.13, 2.65 * Math.pow(1 - u * u, 0.6)),
      x = u * 5.65,
      up = 0.58 * u * u
    for (let j = 0; j < 5; j++)
      b.box(x, up + j * 0.23, 0, 0.41, 0.25, ww * (0.3 + 0.175 * j), j % 2 ? '#8c5537' : '#996846', 'timber')
    b.box(x, up + 1.18, 0, 0.42, 0.12, ww * 1.04, '#c69b67', 'timber')
    if (i % 3 === 0)
      for (const s of [-1, 1]) b.box(x, up + 1.45, ww * 0.5 * s, 0.08, 0.48, 0.08, p.brass, 'copper')
    b.box(x, up - 0.13, 0, 0.41, 0.15, ww * 0.3, '#85cfbe', 'glass')
  }
  for (const xm of [-2.3, 1.75]) {
    b.box(xm, 3.75, 0, 0.16, 5.35, 0.16, '#926d4e', 'timber')
    for (let j = 0; j < 17; j++) {
      const w = (1 - j / 17) * 3.05 + 0.08,
        yy = 2.12 + j * 0.245
      b.box(
        xm + w * 0.41,
        yy,
        0.11 + Math.sin((j / 16) * Math.PI) * 0.34,
        w,
        0.25,
        0.095,
        xm < 0 ? '#e8d99c' : '#a5c7ac',
        'canvas',
        0,
        0.11,
        0,
      )
    }
    for (let j = 0; j < 8; j++) {
      const y = 2.12 + j * 0.5,
        width = (1 - j / 8) * 2.86
      b.box(
        xm + width * 0.41,
        y,
        0.14 + Math.sin((j / 8) * Math.PI) * 0.34,
        width,
        0.037,
        0.1,
        '#aa9966',
        'copper',
      )
    }
    b.beam([xm, 6.38, 0], [xm + 3.5, 2.04, 0.28], 0.035, '#978866', 'timber')
    b.box(xm + 0.32, 6.43, 0, 0.65, 0.19, 0.04, xm < 0 ? '#b66e53' : '#6c9c92', 'canvas')
    for (const s of [-1, 1]) b.beam([xm, 6.32, 0], [xm - 0.95, 1.4, s * 0.94], 0.025, '#675c49', 'timber')
  }
  b.box(-4.35, 1.61, 0, 1.5, 0.82, 1.6, '#694b38', 'timber')
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) b.box(-4.75 + i * 0.42, 1.71, s * 0.81, 0.3, 0.32, 0.07, '#e6bd7b', 'lamp')
  for (const side of [-1, 1]) {
    for (let i = 2; i <= 26; i++) {
      const u = (i - 14) / 14,
        w = Math.max(0.13, 2.65 * Math.pow(1 - u * u, 0.6)),
        x = u * 5.65
      b.box(x, 1.01 + 0.58 * u * u, side * w * 0.49, 0.42, 0.097, 0.061, '#c49b58', 'copper')
      if (i % 4 === 0) {
        b.box(x, 0.76 + 0.58 * u * u, side * w * 0.45, 0.32, 0.27, 0.082, '#553f31', 'timber')
        b.box(x, 0.76 + 0.58 * u * u, side * (w * 0.45 + 0.045), 0.19, 0.153, 0.076, '#81988a', 'glass')
      }
    }
    b.beam([-4.92, 2.2, side * 0.43], [-2.4, 5.6, 0], 0.025, '#544b43', 'timber')
    b.beam([1.8, 6.4, 0], [6.76, 1.96, 0], 0.027, '#6a5d46', 'timber')
  }
  b.beam([4.85, 1.5, 0], [7.18, 2.0, 0], 0.13, p.oak)
  b.finish(group)
  group.name = 'Wayfarer'
  return group
}
