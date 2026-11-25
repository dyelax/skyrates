import type { PortId } from '../data'
import { Blocks, pick, random } from './blocks'
import { lantern } from './architecture'
import type { RoomPlan, Station } from './workroom-plan'

const timber = '#65482f',
  gold = '#b89b60',
  iron = '#4a5252'
/** Joinery, transoms and working displays have volume even when the captain sees the cabinet edge-on. */
export function cabinetJoinery(
  b: Blocks,
  plan: RoomPlan,
  station: Station,
  port: PortId,
  x: number,
  z: number,
  w: number,
  h: number,
) {
  const r = random(684)
  const metal = port === 'copperfall',
    finish = metal ? 'iron' : 'timber',
    frame = metal ? iron : timber
  const feet = 0.29,
    front = z + 0.41
  for (const side of [-1, 1]) {
    const px = x + side * (w * 0.49)
    b.box(px, feet + h / 2, front, 0.15, h + 0.2, 0.21, frame, finish)
    for (const yy of [feet + 0.13, feet + h - 0.15]) b.box(px, yy, front, 0.25, 0.16, 0.28, gold, 'copper')
    b.box(x + side * w * 0.385, feet + h * 0.23, front + 0.09, w * 0.2, 0.11, 0.41, frame, finish)
    b.box(x + side * w * 0.385, feet + h * 0.5, front + 0.09, w * 0.2, 0.11, 0.41, frame, finish)
    b.box(x + side * w * 0.385, feet + h * 0.73, front + 0.07, w * 0.2, 0.1, 0.32, frame, finish)
    for (let i = 0; i < 5; i++) {
      const yy = feet + h * 0.23 + 0.13,
        xx = x + side * w * 0.385 + (i - 2) * w * 0.033
      b.box(
        xx,
        yy,
        front + 0.13,
        0.11,
        0.22,
        0.13,
        port === 'glasshouse' ? '#72a9a7' : pick(['#bda273', '#7d875f', '#b58658'], r),
        port === 'glasshouse' ? 'glass' : 'timber',
      )
      b.box(xx, yy + 0.13, front + 0.13, 0.086, 0.04, 0.085, gold, 'copper')
    }
  }
  for (let i = 0; i < 14; i++) {
    const xx = x - w / 2 + ((i + 0.5) * w) / 14
    b.box(xx, feet + h + 0.11, front + 0.02, w / 14 - 0.03, 0.16, 0.27, frame, finish)
    if (i % 2 === 0) b.box(xx, feet + h + 0.2, front + 0.09, 0.13, 0.12, 0.12, gold, 'copper')
  }
  // Side wall is a working space with shallow shelves, stock and a lower dado.
  const east = plan.w / 2,
    right = east - 0.24,
    zz = -plan.d * 0.21
  b.box(right, 0.68, 0, 0.19, 1.34, plan.d - 0.24, port === 'glasshouse' ? '#605865' : frame, finish)
  b.box(right - 0.06, 1.35, 0, 0.28, 0.13, plan.d - 0.18, gold, 'copper')
  for (let j = 0; j < 9; j++)
    b.box(right - 0.12, 0.64, -plan.d * 0.43 + j * plan.d * 0.108, 0.075, 1.1, 0.077, gold, 'copper')
  for (let tier = 0; tier < 3; tier++) {
    const yy = 1.06 + tier * 0.65
    b.box(right - 0.26, yy, zz, 0.71, 0.13, 4.65, frame, finish)
    for (let i = 0; i < 12; i++) {
      const pz = zz - 2.02 + i * 0.365,
        hh = 0.23 + r() * 0.24
      if (station === 'authority' || port === 'meridian') {
        b.box(
          right - 0.22,
          yy + hh / 2 + 0.065,
          pz,
          0.32,
          hh,
          0.12 + r() * 0.08,
          pick(['#765642', '#783f39', '#405f56', '#6d6754'], r),
          'canvas',
        )
        b.box(right - 0.39, yy + hh * 0.76 + 0.065, pz, 0.017, 0.035, 0.15, gold, 'copper')
      } else {
        b.box(
          right - 0.23,
          yy + hh / 2 + 0.065,
          pz,
          0.23,
          hh,
          0.24,
          port === 'glasshouse' ? '#82b7b3' : pick(['#927351', '#81936f', '#a87a52'], r),
          port === 'glasshouse' ? 'glass' : 'timber',
        )
        b.box(right - 0.23, yy + hh + 0.1, pz, 0.17, 0.08, 0.17, gold, 'copper')
      }
    }
  }
  if (port === 'copperfall' || station === 'shipyard') {
    for (let k = 0; k < 2; k++) {
      const yy = plan.height - 0.45 - k * 0.18
      b.box(right - 0.15, yy, 0, 0.17, 0.12, plan.d - 0.29, k ? iron : gold, 'copper')
      for (let j = 0; j < 6; j++)
        b.box(right - 0.15, yy, -plan.d * 0.4 + j * plan.d * 0.16, 0.235, 0.17, 0.095, frame, 'iron')
    }
  }
  // Glazed gable, cut to follow the actual rafter pitch.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7,
        hh = (1 - u) * 1.55,
        xx = (side * u * plan.w) / 2
      b.box(
        xx,
        plan.height + hh / 2,
        -plan.d / 2,
        plan.w / 14 + 0.015,
        hh + 0.05,
        0.095,
        port === 'glasshouse' ? '#bfa0ae' : '#83a7a4',
        'glass',
      )
      b.box(xx, plan.height + hh / 2, -plan.d / 2 + 0.09, 0.065, hh + 0.08, 0.12, frame, finish)
    }
  }
  lantern(b, -plan.w / 2 + 0.3, 2.42, plan.d * 0.24, 0.72)
}
