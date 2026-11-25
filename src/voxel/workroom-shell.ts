import * as T from 'three'
import type { PortId } from '../data'
import { artTexture, Blocks, pick, random, type Paints, type V3 } from './blocks'
import { lantern, planter, hipRoof, tree } from './architecture'
import { cabinetJoinery } from './fittings'
import { trellis } from './districts'
import type { RoomPlan, Station } from './workroom-plan'

const pigments = {
  sunstep: { base: '#bca378', beam: '#6f5140', paint: '#587c6d', trim: '#b39861' },
  glasshouse: { base: '#bba2a7', beam: '#665967', paint: '#59857e', trim: '#a08862' },
  copperfall: { base: '#9a6d54', beam: '#4f4f4b', paint: '#726253', trim: '#ad8259' },
  meridian: { base: '#b4b6a1', beam: '#596661', paint: '#5f7b75', trim: '#b09766' },
}
export function encloseRoom(
  scene: T.Scene,
  b: Blocks,
  materials: Paints,
  id: PortId,
  station: Station,
  plan: RoomPlan,
  textures: T.Texture[],
) {
  const { w, d, height: h } = plan,
    p = pigments[id],
    r = random(201 + Math.round(w * 31))
  const workshop = station === 'shipyard',
    glassRoof = station === 'civic' && (id === 'sunstep' || id === 'copperfall')
  const west = -w / 2,
    east = w / 2,
    back = -d / 2,
    front = d / 2

  // Walls really enclose the room. Leave open bays for window light and a doorway to the quay.
  b.box(0, -0.22, 0, w + 0.44, 0.43, d + 0.34, '#817462')
  b.box(0, h / 2, back, w + 0.4, h, 0.31, p.base)
  b.box(east, h / 2, 0, 0.3, h, d, p.base)
  for (const side of [-1, 1]) {
    const width = (w - 2.25) / 2
    b.box(side * (w / 2 - width / 2), h / 2, front, width, h, 0.33, p.base)
    b.box(side * 1.13, 1.28, front, 0.22, 2.56, 0.55, p.beam, 'timber')
  }
  b.box(0, 2.68, front, 2.53, 0.28, 0.52, p.trim, 'copper')
  b.box(0, (h + 2.81) * 0.5, front, 2.51, h - 2.81, 0.33, p.base)
  b.box(0, 0.055, front, 2.24, 0.1, 0.74, p.trim, 'copper')
  b.box(west, 0.46, 0, 0.35, 0.92, d, p.base)
  b.box(west, h - 0.45, 0, 0.35, 0.92, d, p.base)
  const bays = workshop ? 5 : 4,
    spacing = d / bays
  for (let i = 0; i <= bays; i++) {
    const zz = back + i * spacing
    b.box(west, h * 0.48, zz, 0.41, h, 0.25, p.beam, 'timber')
    b.box(east - 0.17, h * 0.48, zz, 0.32, h, 0.23, p.beam, 'timber')
    if (i === bays) continue
    const pane = zz + spacing / 2,
      windowH = h - 1.91
    b.box(
      west,
      h * 0.5,
      pane,
      0.061,
      windowH,
      spacing - 0.17,
      id === 'glasshouse' ? '#acc9d2' : '#bad8cd',
      'glass',
    )
    for (let k = 1; k < 4; k++)
      b.box(west + 0.07, h * 0.5, zz + (k * spacing) / 4, 0.12, windowH, 0.057, p.trim, 'copper')
    for (const level of [0.92, h * 0.55, h - 1.01])
      b.box(west + 0.08, level, pane, 0.17, 0.11, spacing, p.beam, 'timber')
    // Small coloured panes in the top transom change character with local trade.
    if (i % 2 === 0)
      for (let k = 0; k < 4; k++)
        b.box(
          west + 0.033,
          h - 1.28,
          zz + ((k + 0.5) * spacing) / 4,
          0.074,
          0.49,
          spacing / 4 - 0.06,
          pick(id === 'glasshouse' ? ['#9c88ad', '#73aaa4', '#c99a77'] : ['#a09c75', '#88a49b', '#bd9e78'], r),
          'glass',
        )
    planter(b, west + 0.35, 0.89, pane, 1.37, r)
  }
  for (let i = 0; i < 8; i++) {
    const y = 0.36 + i * 0.56
    if (y > h - 0.3) break
    for (let j = 0; j < Math.ceil(d / 1.28); j++) {
      const zz = back + j * 1.28 + (i % 2) * 0.5
      if (zz < front - 0.2 && r() > 0.35)
        b.box(
          east - 0.159,
          y,
          zz,
          0.035,
          0.18 + r() * 0.18,
          0.54 + r() * 0.38,
          pick([p.base, '#b19b89', '#ae9480'], r),
        )
    }
  }
  // Tie beams and roof trusses are open toward the side glazing. High strip lights break up the ridge.
  for (let i = 0; i <= bays; i++) {
    const zz = back + i * spacing
    for (const side of [-1, 1]) {
      b.beam([(side * w) / 2, h - 0.18, zz], [0, h + 1.48, zz], 0.2, p.beam, 'timber')
      b.beam([side * (w / 2 - 0.11), h - 1.47, zz], [side * (w / 2 - 1.73), h - 0.21, zz], 0.136, p.trim, 'copper')
    }
    b.box(0, h - 0.15, zz, w, 0.17, 0.18, p.beam, 'timber')
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 8; j++) {
      const u = (j + 0.5) / 8,
        x = side * u * w * 0.5,
        y = h + 1.53 - u * 1.63
      const skylight = glassRoof || j === 5 || j === 6
      b.box(
        x,
        y,
        0,
        w / 16 + 0.04,
        0.16,
        d + 0.41,
        skylight ? '#b4d8c9' : p.beam,
        skylight ? 'glass' : 'timber',
        0,
        0,
        side * -Math.atan2(1.63, w * 0.5),
      )
    }
  }
  // Three-dimensional back cabinet with a painted relief, separately framed and set into the workbench.
  const cabinetX = station === 'authority' ? 0.15 : -0.82,
    cabW = Math.min(w * 0.61, 6.6),
    cabH = Math.min(h * 0.75, 3.85),
    z = back + 0.57
  b.box(cabinetX, cabH / 2 + 0.3, z, cabW + 0.31, cabH + 0.32, 0.78, p.beam, 'timber')
  const cabinet = artTexture('cabinet-' + station + '-' + id + '.webp')
  const material = new T.MeshStandardMaterial({
    map: cabinet,
    roughness: 0.71,
    bumpMap: cabinet,
    bumpScale: 0.055,
  })
  const relief = new T.Mesh(new T.PlaneGeometry(cabW, cabH), material)
  relief.receiveShadow = true
  relief.position.set(cabinetX, 0.3 + cabH / 2, z + 0.403)
  scene.add(relief)
  textures.push(cabinet)
  for (const s of [-1, 1]) {
    b.box(cabinetX + s * (cabW / 2 + 0.07), cabH / 2 + 0.3, z + 0.45, 0.12, cabH + 0.19, 0.16, p.trim, 'copper')
    b.box(cabinetX, 0.3 + cabH / 2 + (s * cabH) / 2, z + 0.44, cabW + 0.21, 0.12, 0.16, p.trim, 'copper')
  }
  cabinetJoinery(b, plan, station, id, cabinetX, z, cabW, cabH)
  b.box(cabinetX, 0.28, z + 0.34, cabW + 0.47, 0.27, 1.33, p.beam, 'timber')
  // Hang practical lamps where workers actually use them.
  const lampPositions: V3[] = [
    [2.8, Math.min(h - 0.62, 3.62), -2.72],
    [-2.7, Math.min(h - 0.54, 3.86), 1.55],
  ]
  lampPositions.forEach(([x, y, z]) => {
    b.beam([x, y + 0.13, z], [x, h - 0.13, z], 0.043, p.trim, 'copper')
    lantern(b, x, y, z, 1.18)
    const bulb = new T.PointLight('#ffd49b', 8.3, 8, 2)
    bulb.position.set(x, y - 0.29, z)
    scene.add(bulb)
  })
  if (id === 'sunstep' || id === 'meridian') trellis(b, cabinetX - cabW * 0.29, cabH + 0.54, z + 0.53, 2.04, 490)
  // Paving wraps in world units and is shared by the quay outside the threshold.
  const tile = artTexture('paving-' + (workshop ? 'copperfall' : id) + '.webp')
  tile.wrapS = tile.wrapT = T.RepeatWrapping
  tile.repeat.set(w / 3.6, d / 3.6)
  tile.anisotropy = 4
  const floor = new T.Mesh(
    new T.PlaneGeometry(w, d),
    new T.MeshStandardMaterial({ map: tile, bumpMap: tile, bumpScale: 0.035, roughness: 0.77 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.018
  floor.receiveShadow = true
  scene.add(floor)
  textures.push(tile)

  // The city outside has parallax as the captain approaches the window.
  for (let i = 0; i < 6; i++) {
    const xx = west - 14 - (i % 2) * 5,
      zz = back - 7 + i * 4.7,
      base = -2.7 + r() * 2,
      hh = 2.15 + r() * 2.4
    b.box(xx, base - 0.83, zz, 4.75, 1.66, 3.82, '#8b8a79')
    b.box(xx, base + hh / 2, zz, 2.95, hh, 2.52, p.base)
    hipRoof(b, xx, base + hh, zz, 3.44, 3.02, 1.35)
    if (i % 2 === 0) tree(b, xx + 2.13, zz + 1.04, 2.66, 181 + i, false, base)
  }
}
