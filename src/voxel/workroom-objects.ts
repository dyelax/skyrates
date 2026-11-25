import * as T from 'three'
import type { PortId } from '../data'
import { Blocks, type Paints, type V2, pick, random } from './blocks'
import { barrel, crate, lantern, planter, tree } from './architecture'
import { trellis } from './districts'
import type { RoomPlan, Station } from './workroom-plan'

const iron = '#444d52',
  brass = '#b79058',
  wood = '#71533d'
function vesselRibs(b: Blocks, x: number, z: number, port: PortId) {
  for (let j = 0; j < 13; j++) {
    const u = (j - 6) / 6,
      ww = 0.42 + (1 - u * u) * 0.93,
      zz = z + u * 2.4
    b.box(x, 0.52 + u * u * 0.25, zz, 0.32, 0.22, 0.44, '#614a39', 'timber')
    for (const s of [-1, 1]) {
      b.beam([x, 0.54 + u * u * 0.25, zz], [x + s * ww, 0.99, zz], 0.105, '#9a7250', 'timber')
      b.beam([x + s * ww, 0.99, zz], [x + s * (ww + 0.12), 1.47 + u * u * 0.32, zz], 0.116, wood, 'timber')
      if (j % 2 === 0) b.box(x + s * ww, 1.09, zz, 0.14, 0.1, 0.14, brass, 'copper')
    }
    if (j % 4 === 0) {
      b.box(x, 0.28, zz, 2.7, 0.25, 0.36, '#5b4439', 'timber')
      b.box(x, 0.39, zz, 0.31, 0.43, 0.31, iron, 'iron')
    }
  }
  for (const s of [-1, 1])
    b.beam(
      [x + s * 0.82, 1.48, z - 1.53],
      [x + s * 1.23, 1.49, z + 1.18],
      0.11,
      port === 'copperfall' ? brass : '#a88058',
      'copper',
    )
}
function growingRack(b: Blocks, x: number, z: number, w: number, port: PortId) {
  const r = random(Math.round((x + 10) * 999))
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      b.box(
        x + side * w * 0.5,
        0.96,
        z + end * 0.9,
        0.11,
        1.86,
        0.13,
        port === 'copperfall' ? iron : wood,
        'timber',
      )
  for (let i = 0; i < 2; i++) {
    b.box(x, 0.67 + i * 0.75, z, w + 0.18, 0.13, 1.91, '#a18360', 'timber')
    for (let j = 0; j < 3; j++) planter(b, x, 0.73 + i * 0.75, z + (j - 1) * 0.55, w * 0.92, r)
  }
}
function kiln(b: Blocks, x: number, z: number) {
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI,
      r = 1.03
    b.box(
      x + Math.cos(a) * r,
      1.23 + Math.sin(a) * r,
      z,
      0.25,
      0.37,
      2.62,
      i % 3 ? '#ad745e' : '#926357',
      'plaster',
      0,
      0,
      a - Math.PI / 2,
    )
  }
  for (const side of [-1, 1]) b.box(x + side * 1.03, 0.7, z, 0.33, 1.45, 2.67, '#aa7054')
  b.box(x, 0.29, z, 2.1, 0.55, 2.67, '#a87c63')
  b.box(x, 1.24, z - 0.93, 1.76, 1.56, 0.27, '#eb8a4a', 'lamp')
  for (let i = 0; i < 8; i++) b.box(x - 0.82 + i * 0.23, 0.84, z + 1.1, 0.058, 0.85, 0.08, iron, 'iron')
}
function dial(b: Blocks, x: number, y: number, z: number, r: number) {
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    b.box(
      x + Math.sin(a) * r,
      y + Math.cos(a) * r,
      z,
      0.1,
      r * 0.24,
      0.13,
      i % 4 ? brass : '#d3b87d',
      'copper',
      0,
      0,
      -a,
    )
  }
  b.beam([x, y, z], [x + r * 0.55, y + r * 0.73, z + 0.01], 0.057, '#d1a46d', 'copper')
}
function instrument(b: Blocks, x: number, z: number, port: PortId) {
  for (let j = 0; j < 4; j++) b.box(x, 0.12 + j * 0.12, z, 1.3 - j * 0.18, 0.18, 1.3 - j * 0.18, brass, 'copper')
  b.box(x, 0.98, z, 0.27, 0.95, 0.27, iron, 'iron')
  if (port === 'glasshouse') {
    for (let i = 0; i < 12; i++) {
      const w = 0.7 + Math.sin((i / 11) * Math.PI) * 0.66
      b.box(x, 1.45 + i * 0.076, z, w, 0.066, w, '#8bc6c4', 'glass')
    }
    for (const s of [-1, 1]) b.box(x + s * 0.67, 1.87, z, 0.09, 1.08, 0.11, brass, 'copper')
  } else {
    b.box(x, 1.85, z, 1.53, 1.48, 0.23, '#536668', 'iron')
    dial(b, x, 1.85, z + 0.18, 0.66)
    if (port === 'meridian')
      for (let j = 0; j < 16; j++) {
        const a = (j / 16) * 2 * Math.PI
        b.box(
          x + Math.cos(a) * 0.91,
          2.45 + Math.sin(a) * 0.4,
          z + Math.sin(a) * 0.62,
          0.22,
          0.065,
          0.16,
          brass,
          'copper',
        )
      }
  }
}
function stockedBins(b: Blocks, x: number, z: number, port: PortId) {
  const r = random(311)
  for (let j = 0; j < 3; j++) {
    const zz = z + (j - 1) * 0.71
    crate(b, x, zz, 0.78)
    for (let k = 0; k < 23; k++) {
      const xx = x + (r() - 0.5) * 0.63,
        yy = 0.63 + r() * 0.15,
        zz2 = zz + (r() - 0.5) * 0.36
      if (port === 'sunstep')
        b.box(xx, yy, zz2, 0.14, 0.16, 0.13, pick(['#d4ac55', '#8d9c4b', '#e2ad4e', '#d48945'], r), 'leaf')
      else if (port === 'glasshouse')
        b.box(xx, yy, zz2, 0.17, 0.28, 0.13, pick(['#7dc2bd', '#b0aecc', '#8baabf'], r), 'glass', 0, r(), 0.27)
      else
        b.box(
          xx,
          yy,
          zz2,
          0.15,
          0.11,
          0.17,
          port === 'copperfall' ? brass : '#a4a781',
          port === 'copperfall' ? 'copper' : 'canvas',
        )
    }
  }
}
export function equipRoom(scene: T.Scene, b: Blocks, m: Paints, id: PortId, station: Station, plan: RoomPlan) {
  const [x, z] = plan.feature,
    [cx, cz] = plan.desk,
    r = random(104),
    animate: ((t: number) => void)[] = []
  if (station === 'shipyard') {
    vesselRibs(b, x, z, id)
    for (const dx of [-1, 1]) b.box(x + dx * 1.4, 2.37, z - 1.7, 0.16, 4.7, 0.15, iron, 'iron')
    b.box(x, 4.68, z - 1.7, 3.17, 0.19, 0.27, iron, 'iron')
    const hoist = new T.Group(),
      part = new Blocks(m)
    part.box(0, -0.71, 0, 0.038, 1.4, 0.04, '#756755', 'iron')
    part.box(0, -1.42, 0, 0.26, 0.16, 0.13, brass, 'copper')
    part.finish(hoist)
    scene.add(hoist)
    animate.push((t) => hoist.position.set(x + Math.sin(t * 0.27) * 0.78, 4.62, z - 1.7))
  } else if (station === 'civic' && (id === 'sunstep' || id === 'copperfall')) {
    growingRack(b, x, z, 1.94, id)
    tree(b, x - 1.27, z - 1.87, 2.94, 718, true)
    trellis(b, x, 3.56, z - 0.64, 2.2, 531)
  } else if (station === 'civic' && id === 'glasshouse') {
    kiln(b, x, z)
    const glow = new T.PointLight('#ff9446', 12, 5, 2)
    glow.position.set(x, 1.48, z + 0.65)
    scene.add(glow)
    animate.push((t) => {
      glow.intensity = 11 + Math.sin(t * 2.4) * 1.6 + Math.cos(t * 3.4) * 0.8
    })
  } else if (station === 'market') {
    stockedBins(b, x, z, id)
    for (let j = 0; j < 3; j++) barrel(b, x + 0.81, z + 0.73 - j * 0.65, 0.57)
  } else instrument(b, x, z, id)

  // A separate work surface and the person who tends it.
  const w = plan.deskWidth
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      b.box(cx + side * (w / 2 - 0.12), 0.47, cz + end * 0.38, 0.155, 0.94, 0.16, wood, 'timber')
  b.box(cx, 1.01, cz, w + 0.15, 0.17, 1.01, '#ba9871', 'timber')
  b.box(cx, 0.62, cz + 0.41, w - 0.21, 0.57, 0.12, id === 'copperfall' ? '#7b5743' : '#49655c', 'timber')
  for (let i = 0; i < 9; i++)
    b.box(cx - w * 0.45 + i * w * 0.112, 0.62, cz + 0.49, 0.034, 0.49, 0.043, brass, 'copper')
  b.box(cx - 0.53, 1.116, cz + 0.07, 0.67, 0.048, 0.44, '#766049', 'timber')
  b.box(cx - 0.53, 1.15, cz + 0.07, 0.59, 0.035, 0.39, '#ddc89c', 'canvas')
  for (let i = 0; i < 6; i++)
    b.box(cx - 0.65, 1.172, cz - 0.06 + i * 0.044, 0.22 + 0.05 * (i % 2), 0.009, 0.012, '#837261', 'canvas')
  lantern(b, cx - 1.0, 1.42, cz - 0.15, 0.68)
  if (station === 'market') stockedBins(b, cx + plan.deskWidth * 0.64, cz - 0.65, id)
  if (station === 'shipyard')
    for (let i = 0; i < 3; i++)
      b.box(cx + 0.18 + i * 0.22, 1.13, cz + 0.15, 0.1, 0.07, 0.51, iron, 'iron', 0, 0.32, 0)
  if (station === 'authority') {
    for (let j = 0; j < 3; j++)
      b.box(cx + 0.52 + j * 0.19, 1.16, cz, 0.16, 0.11, 0.34, pick(['#915e46', '#476e68', '#857046'], r), 'canvas')
  }
  // Cargo and filing cases against the east wall make the room readable from the doorway.
  for (let i = 0; i < 3; i++) {
    const zz = 1.1 - i * 1.32
    crate(b, plan.w / 2 - 0.78, zz, 0.84)
    if (i === 1) crate(b, plan.w / 2 - 0.78, zz, 0.72, 0.57)
  }
  return (t: number) => animate.forEach((step) => step(t))
}
