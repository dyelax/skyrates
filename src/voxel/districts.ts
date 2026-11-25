import type { PortId } from '../data'
import { Blocks, random, pick, type V3 } from './blocks'
import { hipRoof, dome, tree, lantern, planter, barrel, crate } from './architecture'

const greenery = ['#294d3e', '#36573f', '#546a40', '#69814f', '#83985a']
const flowers = ['#81619b', '#8d64a6', '#a582be', '#c3a3d0', '#b68abc']
/** Wisteria branches with hanging racemes; the lower blossoms catch the sky light. */
export function trellis(b: Blocks, x: number, y: number, z: number, span: number, seed: number) {
  const r = random(seed)
  for (let strand = 0; strand < Math.ceil(span * 2.5); strand++) {
    const xx = x + (r() - 0.5) * span,
      drop = 0.35 + r() * 1.12,
      zz = z + r() * 0.28
    b.beam([xx, y + 0.06, zz], [xx + 0.12, y - drop, zz + 0.12], 0.045, '#594d3b', 'timber')
    for (let j = 0; j < 11; j++) {
      const yy = y + 0.12 - (j / 11) * drop
      b.box(
        xx + (r() - 0.5) * 0.29,
        yy,
        zz + r() * 0.22,
        0.13 + r() * 0.15,
        0.1 + r() * 0.13,
        0.14,
        pick(greenery, r),
        'leaf',
      )
    }
    if (r() > 0.24) {
      const cy = y - drop * 0.56
      for (let j = 0; j < 6; j++) {
        const s = (1 - j / 7) * 0.18
        b.box(
          xx + r() * 0.09,
          cy - j * 0.115,
          zz + 0.24,
          s * 1.5,
          s * 1.42,
          s,
          flowers[Math.min(4, Math.floor(j * 0.85))],
          'leaf',
        )
      }
    }
  }
}
function arcade(b: Blocks, a: number, c: number, z: number, top: number, step: number, color: string) {
  const n = Math.round((c - a) / step),
    w = (c - a) / n,
    spring = top - w * 0.51
  b.box((a + c) * 0.5, top + 0.22, z, c - a, 0.57, 1.95, color)
  b.box((a + c) * 0.5, top + 0.54, z, c - a + 0.15, 0.14, 2.16, '#b8a789')
  for (let i = 0; i <= n; i++) {
    const x = a + i * w
    b.box(x, spring - 3.5, z, w * 0.2, 7.4, 1.66, color)
    b.box(x, spring + 0.12, z, w * 0.25, 0.34, 1.9, '#c7b99f')
    if (i === n) continue
    for (let j = 0; j < 11; j++) {
      const angle = ((j + 0.5) * Math.PI) / 11,
        r = w * 0.43
      b.box(
        x + w * 0.5 + Math.cos(angle) * r,
        spring + Math.sin(angle) * r,
        z,
        w * 0.15,
        0.61,
        1.72,
        color,
        'plaster',
        0,
        0,
        angle - Math.PI / 2,
      )
    }
    for (let j = 0; j < 4; j++) b.box(x + ((j + 0.5) * w) / 4, top + 0.96, z + 0.76, 0.13, 0.73, 0.14, '#aa9c89')
  }
}
function mesa(b: Blocks, x: number, z: number, base: number, w: number, d: number, r: () => number, id: PortId) {
  const rock =
    id === 'copperfall'
      ? ['#98604d', '#a16c55', '#90574a', '#755052']
      : ['#8e8493', '#9f9295', '#9d978f', '#7f7b88']
  b.box(x, base - 0.4, z, w, 0.9, d, id === 'copperfall' ? '#97755d' : '#7a8965')
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < Math.ceil(w / 1.24); k++) {
      const xx = x - w / 2 + k * 1.24,
        zz = z + d * 0.5 - row * 0.32
      const depth = 2.6 + r() * 4 + row * 1.4
      b.box(xx, base - 0.3 - depth * 0.5, zz, 1.32 + r() * 0.41, depth, 1.3 + r(), pick(rock, r))
      if (id !== 'copperfall' && r() > 0.37)
        b.box(
          xx,
          base - 0.66 - r() * 0.89,
          zz + 0.66,
          0.21 + r() * 0.5,
          1.33 + r(),
          0.36,
          pick(greenery, r),
          'leaf',
        )
    }
}
function rowHouse(
  b: Blocks,
  x: number,
  z: number,
  y: number,
  w: number,
  d: number,
  h: number,
  r: () => number,
  id: PortId,
  lit: boolean,
) {
  const walls =
    id === 'copperfall' ? ['#95644f', '#b17750', '#ab7153'] : ['#d6b78c', '#d8c095', '#bdac92', '#c8a180']
  b.box(x, y + h / 2, z, w, h, d, pick(walls, r))
  for (let j = 1; j < h; j += 1.65) b.box(x, y + j - 0.2, z, w + 0.11, 0.12, d + 0.14, '#9b8267')
  hipRoof(b, x, y + h, z, w + 0.52, d + 0.47, Math.min(2, h * 0.32))
  for (let i = 0; i < Math.floor(w / 1.1); i++)
    for (let j = 0; j < Math.floor(h / 1.65); j++) {
      const xx = x - w / 2 + 0.65 + i * 1.04,
        yy = y + j * 1.65 + 0.77
      b.box(xx, yy, z + d * 0.5 + 0.05, 0.48, 0.77, 0.08, lit ? '#e1b36e' : '#486e70', lit ? 'lamp' : 'glass')
      b.box(xx, yy - 0.44, z + d * 0.5 + 0.1, 0.68, 0.09, 0.19, '#997f61')
    }
  if (r() > 0.55) b.box(x + w * 0.27, y + h + 0.66, z - 0.36, 0.41, 1.89, 0.48, '#9b795e')
}
/** A layered, walk-around city skyline. Bridges carry the eye between islands at two elevations. */
export function terraces(b: Blocks, id: PortId, seed: number, lit: boolean) {
  const r = random(seed + 934)
  const groups = [
    [-28, -29, 4.3, 25, 12],
    [-8, -42, 7.8, 22, 15],
    [18, -48, 13.5, 27, 15],
    [40, -32, 7.7, 21, 14],
    [25, -65, 17, 36, 14],
    [-36, -56, 11.5, 26, 16],
    [-45, 13, 3.4, 18, 14],
    [37, 15, 1.1, 22, 17],
    [1, 45, 2.5, 26, 12],
    [37, 56, 7, 18, 10],
  ]
  for (let k = 0; k < groups.length; k++) {
    const [x, z, y, w, d] = groups[k]
    mesa(b, x, z, y, w, d, r, id)
    for (let j = 0; j < 7; j++) {
      const xx = x + ((j % 4) - 1.5) * w * 0.22 + 0.3 * r(),
        zz = z + (Math.floor(j / 4) - 0.5) * d * 0.51,
        hh = 2.2 + r() * 5.1
      rowHouse(b, xx, zz, y, 2.16 + r() * 1.48, 2.56 + r(), hh, r, id, lit)
      if (j % 3 === 1 && id !== 'copperfall')
        tree(b, xx + 2.04, zz + 1.2, 2.75 + r() * 1.5, seed + k * 77 + j, false, y)
    }
    if (k % 2 === 0) {
      if (id === 'glasshouse' || id === 'meridian')
        dome(b, x + 3, y + 5, z - 2, 2.2 + r(), 2.25, id === 'glasshouse')
      if (id === 'copperfall')
        for (let i = 0; i < 3; i++)
          b.box(x + i * 0.9, y + 4.5 + i * 0.4, z - 0.83, 0.53, 9 + i * 0.8, 0.53, '#996c59')
    }
  }
  arcade(b, -39, 5, -39.8, 8.35, 4.75, id === 'copperfall' ? '#ac8068' : '#c1ae94')
  arcade(b, 0, 45, -50, 13.5, 5.4, id === 'copperfall' ? '#ad8168' : '#c5b4a1')
  if (id === 'sunstep' || id === 'meridian') {
    for (let i = 0; i < 3; i++) trellis(b, -18 + i * 3.2, 8.75, -38.75, 2.6, 892 + i)
  }
}

export function quayFittings(b: Blocks, id: PortId, mx: number, mz: number, yx: number, yz: number) {
  const r = random(312)
  // Market stock spills onto the apron in stacked trays, baskets and wicker hampers.
  for (let i = 0; i < 4; i++) {
    const x = mx - 2.25 - (i % 2) * 0.57,
      z = mz + 1.03 + Math.floor(i / 2) * 0.57
    barrel(b, x, z, 0.52 + 0.08 * (i % 2))
    for (let j = 0; j < 18; j++)
      b.box(
        x + (r() - 0.5) * 0.39,
        0.59 + r() * 0.11,
        z + (r() - 0.5) * 0.4,
        0.12,
        0.125,
        0.13,
        id === 'sunstep' ? pick(['#d7a529', '#d87f32', '#9f9f3b'], r) : pick(['#9cb9a8', '#ccad76', '#876e61'], r),
        'leaf',
      )
  }
  for (let i = 0; i < 5; i++) crate(b, yx - 0.82 + (i % 2) * 0.64, yz + 1.54 + (i >> 1) * 0.61, 0.61)
  // Two ornamental landing lamps, a double brass skirt and suspended lantern under a curved bracket.
  for (const [x, z] of [
    [-8.9, 4.0],
    [8.05, -4.65],
  ]) {
    b.box(x, 0.16, z, 0.48, 0.33, 0.48, '#837564')
    b.box(x, 1.75, z, 0.1, 3.15, 0.1, '#3b5654', 'iron')
    for (const y of [0.55, 2.45, 3.1]) b.box(x, y, z, 0.19, 0.095, 0.19, '#a0804b', 'copper')
    b.beam([x, 2.68, z], [x + 0.47, 3.42, z], 0.07, '#92794e', 'copper')
    b.box(x + 0.28, 3.34, z, 0.7, 0.07, 0.09, '#6f6550', 'iron')
    lantern(b, x + 0.55, 3.09, z, 0.8)
  }
  if (id === 'sunstep' || id === 'meridian') {
    for (const [x, z, w] of [
      [-8, 7.5, 1.45],
      [-7.9, 6.85, 1.2],
      [8.3, -3.9, 2.1],
    ])
      planter(b, x, 0.02, z, w, r)
  }
}
export function sunstepHall(b: Blocks, x: number, z: number) {
  // Raised central pediment, finials, stone corbels, copper rain pipes and orchard vines.
  const f = z + 2.71
  for (let i = 0; i < 13; i++) {
    const s = 1 - Math.abs(i - 6) / 7
    b.box(x + (i - 6) * 0.225, 4.77 + s * 0.45, f, 0.235, s * 0.86 + 0.15, 0.38, '#a99269')
    b.box(x + (i - 6) * 0.225, 4.89 + s * 0.85, f + 0.06, 0.26, 0.15, 0.44, '#547a6b', 'copper')
  }
  for (const side of [-1, 1]) {
    b.box(x + side * 3.25, 2.43, f + 0.071, 0.105, 4.5, 0.13, '#8c6e4e', 'copper')
    for (let i = 0; i < 7; i++) b.box(x + side * (0.37 + i * 0.43), 4.38, f + 0.061, 0.17, 0.27, 0.46, '#b99e78')
    b.box(x + side * 2.86, 5.1, z + 1.61, 0.11, 0.98, 0.11, '#b2935a', 'copper')
    b.box(x + side * 2.86, 5.59, z + 1.61, 0.23, 0.18, 0.23, '#cab98c', 'copper')
    trellis(b, x + side * 2.66, 4.22, f + 0.21, 1.32, 184 + side)
  }
}
