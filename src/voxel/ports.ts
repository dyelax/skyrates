import * as T from 'three'
import { Blocks, palette as p, random, pick, type Paints, type Place, type V2, type V3 } from './blocks'
import {
  masonry,
  hipRoof,
  dome,
  windowBay,
  door,
  lantern,
  planter,
  townhouse,
  barrel,
  crate,
  stall,
  tree,
  crane,
  pennants,
  ship,
} from './architecture'
import { workShifts } from './work-shifts'
import { terraces, quayFittings, sunstepHall, trellis } from './districts'
import type { PortId } from '../data'

export interface Deck {
  x: number
  z: number
  w: number
  d: number
  timber?: boolean
}
export interface HarborPlan {
  market: V2
  authority: V2
  yard: V2
  berth: V2
  porter: V2[]
  customer: V2
  crew: V2
  decks: Deck[]
  start: V3
  look: V3
  floor: string[]
  hue: string
  hemisphere: string
  sun: string
  seed: number
}
export const plans: Record<PortId, HarborPlan> = {
  sunstep: {
    market: [-6, 3.5],
    authority: [-4.1, -8.6],
    yard: [12.5, -2.7],
    berth: [6.5, -13],
    porter: [
      [-2.3, 7.2],
      [1, 3.4],
      [4.7, -2.3],
      [5.5, -6.3],
      [2.0, -2.2],
      [-3.1, 3.8],
    ],
    customer: [-6, 5.4],
    crew: [6.7, -6.5],
    decks: [
      { x: -3, z: 1.2, w: 26, d: 28 },
      { x: 10.2, z: -4, w: 13.4, d: 12, timber: true },
      { x: 5.7, z: -10.7, w: 3.3, d: 9.2, timber: true },
    ],
    start: [1.2, 2.1, 12],
    look: [0, 2.65, -7],
    floor: ['#c9ae91', '#b8a189', '#d8bea0', '#c9b49d', '#baab99'],
    hue: '#e3b68c',
    hemisphere: '#c4d9ee',
    sun: '#ffd9a0',
    seed: 41,
  },
  glasshouse: {
    market: [-10, -0.5],
    authority: [1, -10],
    yard: [12.5, 1.2],
    berth: [-4, -17],
    porter: [
      [-5.4, 4.6],
      [-2.2, 2],
      [0.3, -3.9],
      [-2.5, -4.3],
    ],
    customer: [-10, 1.6],
    crew: [-0.7, -4.6],
    decks: [
      { x: 0, z: -1, w: 28, d: 25 },
      { x: -7, z: -11, w: 7, d: 11, timber: true },
      { x: 12.5, z: 2, w: 9, d: 9 },
    ],
    start: [1.7, 2.0, 10],
    look: [-1.5, 3.4, -8],
    floor: ['#b8aaad', '#c5b3ba', '#acb7bc', '#d6c0bd'],
    hue: '#b8a8c5',
    hemisphere: '#b9b8ec',
    sun: '#ffddba',
    seed: 206,
  },
  copperfall: {
    market: [-9.3, -0.6],
    authority: [-9.7, -10],
    yard: [7.5, -7.8],
    berth: [12.4, -14.9],
    porter: [
      [-4, 5],
      [-2, 0.7],
      [0.3, -3],
      [-4, -2.7],
    ],
    customer: [-9, 1.6],
    crew: [1, -4.3],
    decks: [
      { x: -5, z: 0, w: 20, d: 26, timber: true },
      { x: 8, z: -6, w: 14, d: 13, timber: true },
      { x: 10.6, z: -13, w: 4, d: 8, timber: true },
    ],
    start: [0.8, 2.05, 10.3],
    look: [-2.2, 3.2, -6],
    floor: ['#b68a62', '#aa7855', '#c09870', '#986d52'],
    hue: '#c5ac9d',
    hemisphere: '#aebecb',
    sun: '#ffd49a',
    seed: 1301,
  },
  meridian: {
    market: [-8, 1.7],
    authority: [1.7, -15.5],
    yard: [11.3, -3.5],
    berth: [-11, -11],
    porter: [
      [-2, 4.7],
      [0.5, 1],
      [1.7, -5],
      [1.4, -8.5],
      [0.8, -5],
    ],
    customer: [-8, 3.7],
    crew: [2.2, -9.2],
    decks: [
      { x: -3, z: 4, w: 17, d: 15 },
      { x: 1.5, z: -5, w: 3.3, d: 9, timber: true },
      { x: 1.5, z: -14.1, w: 13.5, d: 12.3 },
      { x: 7.7, z: 0.1, w: 7, d: 2.6, timber: true },
      { x: 12, z: -3.6, w: 7, d: 10.6 },
      { x: -8.5, z: -3.1, w: 3.3, d: 7.5, timber: true },
    ],
    start: [-1.2, 2.05, 10.2],
    look: [0.3, 3.9, -10],
    floor: ['#a9b9ae', '#d1c8b4', '#acb4ba', '#d4ccb7'],
    hue: '#b7c9c9',
    hemisphere: '#c4dcf0',
    sun: '#ffddbb',
    seed: 351,
  },
}
export interface Collision extends Deck {}
export interface Site {
  place: Place
  center: T.Vector3
  size: T.Vector3
  pin: T.Vector3
}
export interface SetPiece {
  sites: Site[]
  blockades: Collision[]
  ship: T.Group
  moving: (time: number) => void
}
function site(place: Place, x: number, z: number, w: number, h: number, d: number): Site {
  return {
    place,
    center: new T.Vector3(x, h * 0.5, z),
    size: new T.Vector3(w, h, d),
    pin: new T.Vector3(x, h * 0.64, z + d * 0.5 + 0.15),
  }
}
function ground(b: Blocks, deck: Deck, colors: string[], rand: () => number, seed: number) {
  const { x, z, w, d, timber } = deck
  b.box(x, -0.48, z, w, 0.9, d, timber ? '#725940' : '#a68e77', timber ? 'timber' : 'plaster')
  const tileW = timber ? 2.7 : 1.12,
    tileD = timber ? 0.41 : 0.83
  const rows = Math.ceil(d / tileD)
  for (let j = 0; j < rows; j++) {
    const zz = z - d / 2 + ((j + 0.5) * d) / rows,
      shift = (j % 2) * tileW * 0.5
    for (let k = -1; k <= Math.ceil(w / tileW); k++) {
      const start = Math.max(x - w / 2, x - w / 2 + k * tileW + shift),
        end = Math.min(x + w / 2, x - w / 2 + (k + 1) * tileW + shift)
      if (end - start < 0.08) continue
      const c = timber ? pick(['#9a7456', '#a8805b', '#a78262', '#b28d68', '#8d6f56'], rand) : pick(colors, rand)
      b.box(
        (start + end) / 2,
        -0.018 + rand() * 0.016,
        zz,
        end - start - 0.018,
        0.09,
        d / rows - 0.018,
        c,
        timber ? 'timber' : 'plaster',
      )
    }
  }
  const cliff = random(seed)
  if (!timber) {
    // A fractured basalt skerry, with a shallow band of turf right under the deck.
    for (let xx = -w / 2 + 0.6; xx < w / 2; xx += 1.3)
      for (let zz = -d / 2 + 0.6; zz < d / 2; zz += 1.3) {
        if (Math.min(w / 2 - Math.abs(xx), d / 2 - Math.abs(zz)) > 3.1) continue
        const deep = 2 + cliff() * 4 + Math.min(w / 2 - Math.abs(xx), d / 2 - Math.abs(zz))
        b.box(
          x + xx,
          -0.7 - deep / 2,
          z + zz,
          1.4,
          deep,
          1.4,
          pick(['#776b75', '#8e7c79', '#706b77', '#9b887e'], cliff),
        )
      }
  } else {
    for (let xx = -w / 2 + 0.3; xx < w / 2; xx += 3.5)
      for (const side of [-1, 1]) {
        const zz = z + side * (d / 2 - 0.3)
        b.box(x + xx, -2.7, zz, 0.27, 5.4, 0.27, p.dark, 'timber')
        b.beam([x + xx, -3.8, zz], [x + xx + 1.5, -0.45, zz], 0.19, p.oak)
      }
  }
}
function rail(b: Blocks, a: V2, c: V2) {
  const dist = Math.hypot(c[0] - a[0], c[1] - a[1]),
    count = Math.ceil(dist / 2.0)
  for (let i = 0; i <= count; i++) {
    const x = a[0] + ((c[0] - a[0]) * i) / count,
      z = a[1] + ((c[1] - a[1]) * i) / count
    b.box(x, 0.48, z, 0.15, 0.94, 0.15, p.dark, 'timber')
    b.box(x, 0.99, z, 0.2, 0.09, 0.2, p.brass, 'copper')
  }
  for (const y of [0.49, 0.84]) b.beam([a[0], y, a[1]], [c[0], y, c[1]], 0.06, '#a78f60', 'copper')
}
function bridgeScale(b: Blocks, x: number, z: number) {
  for (const s of [-1, 1]) b.box(x + s * 1.1, 1.55, z, 0.17, 3.1, 0.21, p.dark, 'timber')
  b.box(x, 3.02, z, 2.62, 0.22, 0.26, p.brass, 'copper')
  for (const s of [-1, 1]) {
    b.box(x + s * 0.75, 2.48, z, 0.035, 0.91, 0.035, '#614e40', 'iron')
    b.box(x + s * 0.75, 2.0, z, 0.55, 0.1, 0.55, p.brass, 'copper')
  }
}
function glassShed(b: Blocks, x: number, z: number, w: number, len: number) {
  b.box(x, 0.36, z, w, 0.72, len, '#ac9d8d')
  for (let s = -1; s <= 1; s += 2) {
    b.box(x + s * w * 0.49, 1.6, z, 0.12, 1.82, len, '#89c3bd', 'glass')
  }
  const ribs = 18
  for (let i = 0; i < ribs; i++) {
    const xx = ((i + 0.5) / ribs) * 2 - 1,
      yy = 2.52 + Math.sqrt(1 - xx * xx) * w * 0.39
    b.box(
      x + xx * w * 0.5,
      yy,
      z,
      w / ribs + 0.035,
      0.12,
      len,
      i % 5 === 0 ? '#ae986a' : '#98cbbd',
      i % 5 === 0 ? 'copper' : 'glass',
    )
    for (let k = 0; k < 6; k++)
      b.box(x + xx * w * 0.5, yy + 0.07, z + len * (k / 5 - 0.5), w / ribs + 0.04, 0.1, 0.1, '#766f54', 'copper')
  }
  for (let k = 0; k < 6; k++)
    for (const s of [-1, 1])
      b.box(x + s * w * 0.5, 1.65, z + len * (k / 5 - 0.5), 0.11, 1.9, 0.11, p.brass, 'copper')
  for (let i = 0; i < 6; i++)
    planter(b, x + ((i % 2) - 0.5) * w * 0.48, 0.65, z + (Math.floor(i / 2) - 1) * len * 0.27, 1.45, random(i + 4))
}
function tower(b: Blocks, x: number, z: number, h: number, beacon: boolean, lit: boolean) {
  const width = 2.4
  for (let j = 0; j < Math.ceil(h / 0.43); j++) {
    const n = (j * 0.43) / h,
      ww = width * (1 - n * 0.37) + (j % 7 === 0 ? 0.32 : 0)
    b.box(
      x,
      j * 0.43 + 0.21,
      z,
      ww,
      0.43,
      ww * 0.91,
      j % 7 === 0 ? '#ad9676' : pick(['#d4bd9c', '#cdb797', '#d9c4a7'], random(j * 71 + 51)),
    )
    if (j % 6 === 2) b.box(x, j * 0.43 + 0.2, z + ww * 0.46, 0.27, 0.44, 0.07, '#496775', 'glass')
  }
  b.box(x, h + 0.05, z, 2.56, 0.32, 2.56, p.brass, 'copper')
  for (const s of [-1, 1])
    for (const d of [-1, 1]) b.box(x + s * 0.88, h + 0.82, z + d * 0.88, 0.13, 1.3, 0.13, p.dark, 'iron')
  b.box(x, h + 0.85, z, 1.5, 1.19, 1.5, lit ? '#ffd885' : beacon ? '#8fc9c2' : '#aacdc4', lit ? 'lamp' : 'glass')
  hipRoof(b, x, h + 1.5, z, 2.79, 2.79, 1.1)
}
function observatory(b: Blocks, x: number, z: number) {
  masonry(b, x, z, 6.65, 3.65, 5.62, 911)
  dome(b, x, 3.65, z, 3.66, 2.9)
  door(b, x, z + 2.82)
  for (const s of [-1, 1]) {
    windowBay(b, x + s * 2.16, 1.72, z + 2.83, 1.2, 1.61)
    lantern(b, x + s * 1.34, 2.46, z + 2.99)
  }
  b.beam([x + 0.6, 5.6, z + 0.3], [x + 2.7, 7.1, z + 1.5], 0.59, '#997b54', 'copper')
  b.box(x + 2.69, 7.12, z + 1.5, 0.79, 0.71, 0.75, '#79a8ae', 'glass')
}
function foundry(b: Blocks, x: number, z: number) {
  const width = 5.7,
    depth = 4.8
  masonry(b, x, z, width, 4.25, depth, 252)
  hipRoof(b, x, 4.23, z, 6.0, 5.0, 1.5, ['#8d6556', '#9d7862', '#776160'])
  const front = z + depth / 2
  b.box(x, 1.47, front + 0.11, 3.23, 2.74, 0.18, '#554745', 'iron')
  b.box(x + 0.46, 0.85, front + 0.22, 1.35, 1.56, 0.08, '#eb985a', 'lamp')
  for (let i = 0; i < 5; i++) b.box(x - 0.1 + i * 0.29, 1.02, front + 0.3, 0.055, 1.65, 0.1, '#69584e', 'iron')
  for (const side of [-1, 1]) {
    b.box(x + side * 2.02, 4.45, z - 1.12, 0.87, 8.55, 0.87, '#a77156')
    for (let j = 0; j < 5; j++)
      b.box(x + side * 2.02, 2.5 + j * 1.36, z - 1.12, 1.04, 0.18, 1.04, '#6d6259', 'iron')
  }
}
function balloon(b: Blocks, x: number, y: number, z: number, r: number, color: string) {
  const cell = r / 5.2
  for (let i = -5; i <= 5; i++)
    for (let j = -6; j <= 6; j++)
      for (let k = -5; k <= 5; k++) {
        const rr = (i * i) / 28 + (j * j) / 40 + (k * k) / 28
        if (rr > 1 || rr < 0.58) continue
        b.box(
          x + i * cell,
          y + j * cell,
          z + k * cell,
          cell * 1.04,
          cell * 1.04,
          cell * 1.04,
          i === 0 || k === 0 ? '#bba078' : color,
          'canvas',
        )
      }
  b.beam([x, y - r * 0.93, z], [x, 1.0, z], 0.045, '#756b57', 'timber')
}
function skyline(b: Blocks, id: PortId, plan: HarborPlan, night: boolean) {
  const r = random(plan.seed + 190)
  for (let i = 0; i < 19; i++) {
    const angle = (i / 19) * Math.PI * 2 + r() * 0.12,
      dist = 58 + r() * 65
    const x = Math.cos(angle) * dist,
      z = Math.sin(angle) * dist,
      radius = 3.7 + r() * 7,
      y = -9 + r() * 10
    for (let j = 0; j < 4; j++)
      b.box(
        x,
        y - j * 1.7,
        z,
        radius * (1.8 - 0.22 * j),
        1.8,
        radius * (1.4 - 0.19 * j),
        j === 0 ? '#83937d' : '#938b91',
      )
    for (let k = 0; k < 4; k++) {
      const xx = x + (r() - 0.5) * radius,
        zz = z + (r() - 0.5) * radius,
        h = 3.1 + r() * 7.3
      b.box(xx, y + h / 2 + 0.9, zz, 1.8 + r() * 1.0, h, 2.16, id === 'copperfall' ? '#a78570' : '#cab597')
      hipRoof(b, xx, y + h + 0.85, zz, 3.06, 2.7, 1.2)
      if (k % 2 === 0) b.box(xx, y + h + 2.5, zz, 0.17, 2.7, 0.17, p.brass, 'copper')
      for (let win = 0; win < 4; win++)
        b.box(
          xx - 0.47 + (win % 2) * 0.82,
          y + h * 0.42 + Math.floor(win / 2) * 1.1,
          zz + 1.09,
          0.34,
          0.62,
          0.07,
          night ? '#edce85' : '#708989',
          night ? 'lamp' : 'glass',
        )
    }
  }
}
export function buildPort(scene: T.Scene, id: PortId, materials: Paints, night: boolean): SetPiece {
  const plan = plans[id],
    r = random(plan.seed),
    b = new Blocks(materials)
  plan.decks.forEach((d, i) => ground(b, d, plan.floor, r, plan.seed * 33 + i))
  skyline(b, id, plan, night)
  terraces(b, id, plan.seed, night)
  const [mx, mz] = plan.market,
    [ax, az] = plan.authority,
    [yx, yz] = plan.yard,
    [sx, sz] = plan.berth
  const sites: Site[] = [
    site('market', mx, mz, 4.9, 3.22, 3.2),
    site('authority', ax, az, 6.1, 5.9, 5),
    site('shipyard', yx, yz, 5, 5.1, 4.4),
    site('ship', sx, sz, 10, 6.3, 3.8),
  ]
  const blockades: Collision[] = [
    { x: mx, z: mz, w: 4.65, d: 2.26 },
    { x: ax, z: az, w: 6.7, d: 5.65 },
    { x: yx, z: yz, w: 4.9, d: 4.4 },
  ]
  const civic: Record<PortId, [number, number, number, number, number]> = {
    sunstep: [-10.4, -2.1, 3.8, 2.4, 2.0],
    glasshouse: [-7.2, -7.5, 3.4, 3.5, 3.8],
    copperfall: [-13.9, -4.3, 3.5, 3.8, 4.55],
    meridian: [-2.1, -11.35, 2.2, 2.5, 1.6],
  }
  sites.push(site('civic', ...civic[id]))
  const [cx, cz, cw, , cd] = civic[id]
  blockades.push({ x: cx, z: cz, w: cw, d: cd })
  const animated = [workShifts(scene, b, materials, id, night)]
  if (id === 'sunstep') {
    stall(b, mx, mz, '#be664e', 'fruit', 4.7)
    townhouse(b, ax, az, 6.6, 4.68, 5.3, 57, night)
    sunstepHall(b, ax, az)
    tower(b, ax - 1.02, az - 1.55, 7.15, false, night)
    bridgeScale(b, ax + 3.2, az + 3.53)
    // Orchard allotments rise behind the common weighhouse.
    for (let row = 0; row < 3; row++) {
      const xx = -15 - row * 3.8,
        z = -4 - row * 4.7,
        yy = 0.6 + row * 1.28
      b.box(xx, yy * 0.5, z, 7.4, yy, 11, '#b8a27b')
      for (let i = 0; i < 4; i++)
        tree(
          b,
          xx + ((i % 2) - 0.5) * 3.0,
          z + (Math.floor(i / 2) - 0.5) * 4.1,
          3.7 + r() * 1.38,
          99 + i + row * 11,
          true,
          yy,
        )
    }
    for (const dx of [-1.6, 1.6]) {
      b.box(-10.4 + dx, 1.0, -2.1, 0.19, 2.0, 0.22, p.oak, 'timber')
      tree(b, -10.4 + dx, -2.8, 2.3, 624 + Math.round(dx * 10), true)
    }
    b.box(-10.4, 2.23, -2.1, 3.65, 0.22, 0.3, p.oak, 'timber')
    planter(b, -10.4, 0.12, -2.1, 2.8, r)
    tree(b, -12.7, 10.2, 5.2, 713, true)
    planter(b, -8.8, 0.02, 7.6, 1.8, r)
    pennants(b, [mx - 2, 3.05, mz - 0.7], [ax + 2.8, 4.5, az + 2.6], 11, ['#e9c685', '#91a78a', '#c57661'])
    crane(b, yx - 1.0, yz + 1.4, 6.75)
    for (const x of [yx - 2.0, yx + 2])
      for (const z of [yz - 1.1, yz + 1.7]) b.box(x, 2.1, z, 0.22, 4.2, 0.24, p.oak, 'timber')
    hipRoof(b, yx, 4.28, yz, 5.3, 4.1, 1.25)
    rail(b, [1, -8.8], [3.9, -8.8])
    rail(b, [7.52, -8.85], [12.1, -8.85])
  } else if (id === 'glasshouse') {
    stall(b, mx, mz, '#778a9f', 'glass')
    tower(b, ax, az - 0.8, 9.35, true, night)
    masonry(b, ax, az + 0.96, 4.6, 2.73, 3.1, 24)
    door(b, ax, az + 2.55)
    trellis(b, -8.65, 3.86, -5.55, 2.25, 491)
    for (let i = 0; i < 3; i++) glassShed(b, -10.8 + i * 2.55, -8 - i * 1.33, 3.5, 4.2)
    glassShed(b, 7.9, -7.6, 5.2, 6.6)
    foundry(b, yx, yz)
    for (let i = 0; i < 3; i++) {
      b.box(ax - 2.75 + i * 0.85, 3.1, az + 3.1, 0.4, 0.51, 0.4, p.brass, 'copper')
      b.box(ax - 2.75 + i * 0.85, 2.84, az + 3.1, 0.64, 0.12, 0.58, p.brass, 'copper')
    }
    b.box(ax - 1.87, 3.55, az + 3.1, 2.9, 0.13, 0.18, p.dark, 'timber')
    b.box(4, 0.055, 3.35, 1.7, 0.07, 9.4, '#619c9e', 'water')
    for (const x of [3, 5]) b.box(x, 0.13, 3.35, 0.17, 0.24, 9.7, '#b8a7a2')
    blockades.push({ x: 4, z: 3.35, w: 1.75, d: 9.4 })
    for (let i = 0; i < 8; i++)
      b.box(
        yx - 3.1 + (i % 2) * 0.5,
        0.75,
        yz + 2.25 + (i >> 1) * 0.3,
        0.1,
        1.5,
        0.78,
        pick(['#6dbcb2', '#a5b8c8', '#a89db6'], r),
        'glass',
        0,
        0.1,
        0.1,
      )
    pennants(b, [mx, 3.4, mz], [ax - 1, 5.4, az + 2], 10, ['#a694b2', '#8eaea3', '#d6aa89'])
  } else if (id === 'copperfall') {
    stall(b, mx, mz, '#a96847', 'iron')
    masonry(b, ax, az, 6.1, 3.7, 5.3, 754)
    door(b, ax, az + 2.65)
    foundry(b, yx, yz)
    for (const x of [ax - 2.65, ax + 2.65]) b.box(x, 3.15, az + 2.85, 0.52, 6.1, 0.49, '#885c44', 'copper')
    b.box(ax, 6.05, az + 2.85, 5.9, 0.58, 0.65, '#9c6d4b', 'copper')
    for (let i = 0; i < 11; i++) {
      const x = ax - 2.75 + i * 0.55,
        y = 5.9 - Math.sin((Math.PI * i) / 10) * 0.87
      b.box(
        x,
        y,
        az + 2.9,
        0.64,
        0.17,
        0.18,
        i % 2 ? p.brass : p.iron,
        i % 2 ? 'copper' : 'iron',
        0,
        0,
        (i - 5) * 0.09,
      )
    }
    for (let k = 0; k < 5; k++) {
      const x = ax - 1.8 + k * 0.91
      b.box(x, 3.44, az + 2.73, 0.53, 0.56, 0.14, p.brass, 'copper')
    }
    crane(b, 2.7, -6.7, 8.8)
    crane(b, 13, -11, 7.7)
    // The unfinished keel is visible from the elevated wooden yard.
    for (let j = 0; j < 12; j++) {
      const z = -9.3 + j * 0.66,
        w = 1 + Math.sin((j / 12) * Math.PI) * 2.0
      b.box(-0.2, -0.23, z, 0.53, 0.75, 0.6, p.dark, 'timber')
      for (const side of [-1, 1]) b.beam([-0.2, -0.3, z], [-0.2 + side * w * 0.5, 1.4, z], 0.15, p.oak)
    }
    glassShed(b, -13.9, -4.3, 3.5, 4.55)
    blockades.push({ x: -0.2, z: -6.1, w: 3.1, d: 8.2 })
    rail(b, [1.5, -8.2], [1.5, -2.4])
  } else {
    stall(b, mx, mz, '#909cab', 'silk')
    observatory(b, ax, az)
    crane(b, yx, yz, 4.25)
    for (let i = 0; i < 3; i++) {
      const x = yx - 1.2 + i * 1.05
      b.box(x, 1.3, yz + 0.7, 0.08, 2.6, 0.08, p.brass, 'copper')
      b.box(x + 0.34, 2.26, yz + 0.7, 0.6, 0.39, 0.055, ['#c19074', '#72a09a', '#d3aa71'][i], 'canvas')
    }
    for (let i = 0; i < 4; i++) {
      const group = new T.Group(),
        kit = new Blocks(materials),
        x = -12 + i * 7.1,
        z = -16 - (i % 2) * 9
      balloon(kit, 0, 0, 0, 1.18 + i * 0.075, ['#d7a775', '#90aaa6', '#bda0a6', '#d3ba83'][i])
      kit.finish(group)
      group.position.set(x, 8.6 + (i % 2) * 2, z)
      scene.add(group)
      animated.push((t) => {
        group.rotation.z = Math.sin(t * 0.42 + i) * 0.055
        group.position.y = 8.6 + (i % 2) * 2 + Math.sin(t * 0.53 + i) * 0.17
      })
      b.beam([x, 0, z], [x, 7.5 + (i % 2) * 2, z], 0.035, '#796d5a', 'timber')
    }
    b.box(-2.1, 1.28, -11.35, 2.08, 1.45, 0.15, '#536e6a', 'iron')
    for (const xx of [-3.13, -1.07]) b.box(xx, 1.14, -11.35, 0.14, 2.28, 0.17, p.oak, 'timber')
    for (let i = 0; i < 6; i++) b.box(-2.12, 1.76 - i * 0.18, -11.23, 1.55 - i * 0.12, 0.045, 0.04, '#c6cdc0')
    for (const side of [-1, 1]) rail(b, [1.5 + side * 1.52, -3.5], [1.5 + side * 1.52, -8])
    b.box(ax - 2.7, 1.4, az + 3.27, 1.48, 1.09, 0.1, '#415b62', 'iron')
    for (let i = 0; i < 4; i++)
      b.box(ax - 2.75, 1.64 - i * 0.15, az + 3.34, 0.95 - i * 0.13, 0.029, 0.025, '#cbd3c8')
  }
  for (let i = 0; i < 4; i++) crate(b, mx + 2.63 + (i % 2) * 0.71, mz + 0.24 + (i >> 1) * 0.65, 0.72)
  barrel(b, mx - 2.92, mz + 0.47, 0.68)
  barrel(b, yx - 2.5, yz + 2.4, 0.85)
  for (let k = 0; k < 3; k++) crate(b, yx + 1.7 + (k % 2) * 0.9, yz + 2.9, 0.85, Math.floor(k / 2) * 0.6)
  for (const x of [mx - 2.0, mx + 2.0]) lantern(b, x, 2.28, mz + 1.4, 0.78)
  quayFittings(b, id, mx, mz, yx, yz)
  b.finish(scene)
  const vessel = ship(materials)
  vessel.position.set(sx, -0.49, sz)
  vessel.scale.setScalar(1.27)
  vessel.rotation.y = 0.28
  scene.add(vessel)
  animated.push((t) => {
    vessel.position.y = -0.49 + Math.sin(t * 0.6) * 0.1
    vessel.rotation.z = Math.sin(t * 0.39) * 0.014
    vessel.rotation.x = Math.sin(t * 0.47) * 0.018
  })
  return { sites, blockades, ship: vessel, moving: (t) => animated.forEach((f) => f(t)) }
}
