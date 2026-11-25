import * as T from 'three'
import { PORT_IDS, type PortId } from '../data'
import { stations, type Station } from './workroom-plan'
import { Blocks, palette, type Paints, type V2, type V3 } from './blocks'
import type { HarborPlan } from './ports'

const faceFor = (port: PortId, role: Station) => PORT_IDS.indexOf(port) * 4 + stations.indexOf(role)
const locals: Record<PortId, Station> = {
  sunstep: 'civic',
  glasshouse: 'market',
  copperfall: 'market',
  meridian: 'authority',
}
interface Clothes {
  skin: string
  shade: string
  hair: string
  coat: string
  shirt: string
  pants: string
  hat: string
  scarf: string
  style: 'cap' | 'band' | 'bun' | 'hood'
}
const attire: Record<PortId, Clothes> = {
  sunstep: {
    skin: '#c8956d',
    shade: '#a47154',
    hair: '#40352d',
    coat: '#455769',
    shirt: '#e2d0af',
    pants: '#6c6256',
    hat: '#4a627b',
    scarf: '#a75a43',
    style: 'cap',
  },
  glasshouse: {
    skin: '#ba936e',
    shade: '#906947',
    hair: '#463b33',
    coat: '#856143',
    shirt: '#e5d7bc',
    pants: '#4e6461',
    hat: '#70583e',
    scarf: '#638b81',
    style: 'band',
  },
  copperfall: {
    skin: '#c09872',
    shade: '#a27154',
    hair: '#443630',
    coat: '#4c5054',
    shirt: '#e5d6bc',
    pants: '#605a59',
    hat: '#a95444',
    scarf: '#c0a064',
    style: 'hood',
  },
  meridian: {
    skin: '#d5ad91',
    shade: '#b4866c',
    hair: '#995e43',
    coat: '#d5c8a6',
    shirt: '#e7dcc2',
    pants: '#59676c',
    hat: '#477d76',
    scarf: '#578e89',
    style: 'bun',
  },
}
interface Rig {
  mesh: T.SkinnedMesh
  joint: Record<string, T.Bone>
}
// The same complexion follows a named worker between their outdoor shift and their counter.
const complexions = [
  ['#b78668', '#302d28'],
  ['#956c57', '#968e84'],
  ['#b48260', '#3e352c'],
  ['#ce9c82', '#925439'],
  ['#ba8a69', '#46372d'],
  ['#977459', '#787369'],
  ['#c29773', '#332e2b'],
  ['#c79b86', '#a48d70'],
  ['#b47f63', '#3a302b'],
  ['#90634d', '#64574a'],
  ['#bb9475', '#8b8070'],
  ['#b78b69', '#483d34'],
  ['#aa8064', '#42352d'],
  ['#cea08b', '#955a41'],
  ['#aa785a', '#47372b'],
  ['#c3997f', '#9c7759'],
]
const boxes = new T.BoxGeometry(1, 1, 1).toNonIndexed()

/** Every voxel in a limb shares its anatomical joint. Each person needs one draw call. */
function person(clothes: Clothes, material: T.MeshStandardMaterial, face?: number): Rig {
  if (face !== undefined) clothes = { ...clothes, skin: complexions[face][0], hair: complexions[face][1] }
  const joint: Record<string, T.Bone> = {},
    bones: T.Bone[] = [],
    pos: number[] = [],
    norm: number[] = [],
    cols: number[] = [],
    uvs: number[] = [],
    indices: number[] = [],
    weights: number[] = []
  function bone(name: string, parent: string | null, x: number, y: number, z: number) {
    const node = new T.Bone()
    node.name = name
    node.position.set(x, y, z)
    if (parent) joint[parent].add(node)
    bones.push(node)
    joint[name] = node
    return node
  }
  bone('hips', null, 0, 0.91, 0)
  bone('chest', 'hips', 0, 0.12, 0)
  bone('head', 'chest', 0, 0.41, 0)
  for (const s of [-1, 1]) {
    bone('upperArm' + s, 'chest', s * 0.228, 0.315, 0)
    bone('forearm' + s, 'upperArm' + s, 0, -0.251, 0)
    bone('thigh' + s, 'hips', s * 0.108, -0.015, 0)
    bone('shin' + s, 'thigh' + s, 0, -0.415, 0)
    bone('foot' + s, 'shin' + s, 0, -0.375, 0)
  }
  joint.hips.updateMatrixWorld(true)
  const pc = boxes.getAttribute('position'),
    nc = boxes.getAttribute('normal'),
    pt = new T.Vector3()
  function piece(name: string, x: number, y: number, z: number, w: number, h: number, d: number, shade: string) {
    const node = joint[name],
      i = bones.indexOf(node),
      c = new T.Color(shade)
    for (let k = 0; k < pc.count; k++) {
      pt.set(x + pc.getX(k) * w, y + pc.getY(k) * h, z + pc.getZ(k) * d).applyMatrix4(node.matrixWorld)
      pos.push(pt.x, pt.y, pt.z)
      norm.push(nc.getX(k), nc.getY(k), nc.getZ(k))
      const portrait =
        face !== undefined &&
        material.map &&
        name === 'head' &&
        (shade === clothes.skin || shade === clothes.shade) &&
        nc.getZ(k) > 0.5 &&
        y > 0.05
      if (portrait) {
        // Paint the relief of the brow, cheeks and nose in head coordinates.
        const u = T.MathUtils.clamp((x + pc.getX(k) * w) / 0.235 + 0.5, 0.018, 0.982)
        const v = T.MathUtils.clamp((y + pc.getY(k) * h - 0.027) / 0.225, 0.018, 0.982)
        uvs.push(((face % 4) + u) * 0.25, 1 - (Math.floor(face / 4) + 1 - v) * 0.2)
        cols.push(1, 1, 1)
      } else {
        const cloth = [clothes.coat, clothes.shirt, clothes.hat, clothes.pants].includes(shade)
        if (cloth) {
          uvs.push(0.02 + (pc.getX(k) + 0.5) * 0.21, 0.02 + (pc.getY(k) + 0.5) * 0.16)
        } else uvs.push(0.88, 0.1)
        cols.push(c.r, c.g, c.b)
      }
      indices.push(i, 0, 0, 0)
      weights.push(1, 0, 0, 0)
    }
  }
  piece('hips', 0, 0.015, 0, 0.34, 0.16, 0.23, clothes.pants)
  piece('chest', 0, 0.147, -0.01, 0.365, 0.28, 0.24, clothes.coat)
  piece('chest', 0, 0.294, 0, 0.41, 0.13, 0.255, clothes.coat)
  piece('chest', 0, 0.175, 0.133, 0.13, 0.3, 0.028, clothes.shirt)
  for (const s of [-1, 1]) {
    piece('chest', s * 0.078, 0.29, 0.148, 0.073, 0.12, 0.03, clothes.scarf)
    piece('chest', s * 0.14, 0.174, 0.136, 0.066, 0.058, 0.019, clothes.coat)
    piece('upperArm' + s, s * 0.012, -0.07, 0, 0.14, 0.215, 0.15, clothes.shirt)
    piece(
      'upperArm' + s,
      s * 0.013,
      -0.206,
      0.01,
      0.119,
      0.094,
      0.137,
      clothes.style === 'bun' ? clothes.coat : clothes.shirt,
    )
    piece('forearm' + s, s * 0.007, -0.101, 0.006, 0.1, 0.216, 0.121, clothes.skin)
    piece('forearm' + s, 0, -0.205, 0.018, 0.104, 0.108, 0.103, clothes.skin)
    piece('thigh' + s, 0, -0.17, 0, 0.145, 0.37, 0.18, clothes.pants)
    piece('shin' + s, 0, -0.13, 0, 0.13, 0.3, 0.148, clothes.pants)
    piece('shin' + s, 0, -0.293, 0, 0.139, 0.15, 0.15, '#614c3d')
    piece('foot' + s, 0, -0.01, 0.045, 0.15, 0.105, 0.24, '#584539')
  }
  piece('chest', 0, 0.013, 0.013, 0.37, 0.077, 0.256, '#5e4c39')
  piece('chest', 0, 0.014, 0.153, 0.06, 0.059, 0.017, '#bd9958')
  for (let i = 0; i < 3; i++) piece('chest', 0.073, 0.095 + i * 0.067, 0.155, 0.022, 0.021, 0.012, '#c4aa76')
  piece('head', 0, 0.008, 0, 0.134, 0.14, 0.144, clothes.skin)
  piece('head', 0, 0.13, 0.003, 0.221, 0.2, 0.208, clothes.skin)
  piece('head', 0, 0.2, -0.016, 0.237, 0.155, 0.209, clothes.skin)
  piece('head', 0, 0.111, 0.117, 0.064, 0.045, 0.042, clothes.shade)
  piece('head', 0, 0.147, 0.121, 0.049, 0.067, 0.045, clothes.skin)
  if (face === undefined || !material.map) piece('head', 0, 0.078, 0.109, 0.076, 0.012, 0.019, '#8b5e49')
  for (const s of [-1, 1]) {
    piece('head', s * 0.119, 0.147, -0.007, 0.036, 0.072, 0.055, clothes.skin)
    if (face === undefined || !material.map) piece('head', s * 0.054, 0.173, 0.111, 0.041, 0.023, 0.017, '#e0cbb1')
    if (face === undefined || !material.map) piece('head', s * 0.054, 0.173, 0.122, 0.018, 0.022, 0.014, '#443d37')
    if (face === undefined || !material.map)
      piece('head', s * 0.054, 0.201, 0.111, 0.05, 0.016, 0.02, clothes.hair)
    piece('head', s * 0.111, 0.209, -0.05, 0.034, 0.121, 0.101, clothes.hair)
  }
  piece('head', 0, 0.24, -0.021, 0.244, 0.116, 0.235, clothes.hair)
  piece('head', 0, 0.171, -0.111, 0.222, 0.146, 0.039, clothes.hair)
  if (clothes.style === 'cap') {
    piece('head', 0, 0.304, -0.011, 0.273, 0.079, 0.251, clothes.hat)
    piece('head', 0, 0.27, 0.105, 0.252, 0.038, 0.14, clothes.hat)
    if (face === undefined || !material.map) piece('head', 0, 0.104, 0.123, 0.115, 0.024, 0.022, clothes.hair)
  } else if (clothes.style === 'band' || clothes.style === 'bun') {
    piece('head', 0, 0.258, -0.011, 0.254, 0.048, 0.237, clothes.hat)
    for (const s of [-1, 1]) {
      piece('head', s * 0.057, 0.259, 0.117, 0.087, 0.067, 0.042, '#b29964')
      piece('head', s * 0.057, 0.259, 0.141, 0.058, 0.041, 0.018, '#577c83')
    }
    if (clothes.style === 'bun') piece('head', 0, 0.231, -0.146, 0.133, 0.129, 0.125, clothes.hair)
    else piece('chest', 0, 0.099, 0.156, 0.255, 0.224, 0.035, clothes.coat)
  } else {
    piece('head', 0, 0.287, -0.014, 0.251, 0.076, 0.231, clothes.hat)
    piece('head', -0.107, 0.221, -0.11, 0.078, 0.12, 0.085, clothes.hat)
    piece('head', 0.128, 0.115, -0.011, 0.024, 0.053, 0.02, '#d1a462')
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new T.Float32BufferAttribute(norm, 3))
  geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3))
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(indices, 4))
  geo.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4))
  const mesh = new T.SkinnedMesh(geo, material)
  mesh.add(joint.hips)
  mesh.bind(new T.Skeleton(bones))
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  return { mesh, joint }
}

function pose(rig: Rig, phase: number, speed: number, push: number, reach: number, look: number, time: number) {
  const j = rig.joint,
    cycle = Math.sin(phase)
  j.hips.position.y = 0.91 + speed * (Math.abs(Math.cos(phase)) * 0.032 - 0.016) + Math.sin(time * 2.1) * 0.005
  j.hips.rotation.y = cycle * 0.07 * speed
  j.chest.rotation.y = -cycle * 0.105 * speed + reach * 0.09
  j.chest.rotation.x = 0.035 * push + 0.065 * speed + reach * 0.12
  j.chest.rotation.z = cycle * 0.026 * speed
  j.head.rotation.y = look
  j.head.rotation.x = Math.sin(time * 1.65) * 0.027 + reach * 0.09
  for (const s of [-1, 1]) {
    const stride = cycle * s * speed
    j['thigh' + s].rotation.x = -0.5 * stride
    j['shin' + s].rotation.x = 0.75 * Math.max(0, Math.sin(phase + (s === 1 ? 0 : Math.PI) - 0.62)) * speed
    j['foot' + s].rotation.x = 0.17 * stride - j['shin' + s].rotation.x * 0.36
    const offer = s === 1 ? reach : 0
    j['upperArm' + s].rotation.x = 0.37 * stride * (1 - push) - push * 0.74 - offer * 1.03 - 0.07
    j['upperArm' + s].rotation.z = s * (0.07 + 0.04 * speed)
    j['forearm' + s].rotation.x = -0.16 - push * 0.52 - offer * 0.36 - 0.16 * Math.max(0, -stride)
  }
}
interface Leg {
  from: V2
  to: V2
  duration: number
  pause: number
  start: number
  distance: number
}
function circuit(points: V2[], metersPerSecond: number, pauses: number[]) {
  const legs: Leg[] = []
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const from = points[i],
      to = points[(i + 1) % points.length],
      distance = Math.hypot(to[0] - from[0], to[1] - from[1])
    const duration = distance / metersPerSecond,
      pause = pauses[i] ?? 0.25
    legs.push({ from, to, duration, pause, start: total, distance })
    total += duration + pause
  }
  return (t: number) => {
    const local = ((t % total) + total) % total,
      leg = legs.find((l) => local < l.start + l.duration + l.pause) ?? legs[legs.length - 1]
    const a = local - leg.start,
      u = Math.min(1, a / leg.duration)
    return {
      x: T.MathUtils.lerp(leg.from[0], leg.to[0], u),
      z: T.MathUtils.lerp(leg.from[1], leg.to[1], u),
      angle: Math.atan2(leg.to[0] - leg.from[0], leg.to[1] - leg.from[1]),
      walk: Math.min(1, a * 5, Math.max(0, (leg.duration - a) * 5)),
      wait: Math.max(0, a - leg.duration),
      index: legs.indexOf(leg),
    }
  }
}
function cart(materials: Paints) {
  const g = new T.Group(),
    b = new Blocks(materials)
  for (const s of [-1, 1]) {
    b.box(s * 0.39, 0.85, -0.39, 0.063, 0.07, 1.7, '#73513a', 'timber')
    b.box(s * 0.495, 0.84, 0.5, 0.08, 0.32, 1.0, '#a57c51', 'timber')
  }
  b.box(0, 0.58, 0.49, 0.97, 0.12, 1.07, '#ad845a', 'timber')
  b.box(0, 0.82, 0.98, 0.96, 0.34, 0.09, '#936941', 'timber')
  for (let i = 0; i < 27; i++)
    b.box(
      ((i % 5) - 2) * 0.164,
      0.8 + (i > 19 ? 0.13 : 0),
      0.2 + Math.floor((i % 20) / 5) * 0.18,
      0.156,
      0.162,
      0.151,
      i % 3 === 1 ? '#aeb450' : '#dc9b49',
      'leaf',
    )
  b.finish(g)
  const wheels: T.Group[] = []
  for (const s of [-1, 1]) {
    const rim = new Blocks(materials),
      wheel = new T.Group()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      rim.box(0, Math.cos(a) * 0.39, Math.sin(a) * 0.39, 0.09, 0.162, 0.105, '#655039', 'timber', a, 0, 0)
      if (i % 2 === 0) rim.beam([0, 0, 0], [0, Math.cos(a) * 0.36, Math.sin(a) * 0.36], 0.033, '#8a6b49', 'timber')
    }
    rim.box(0, 0, 0, 0.16, 0.12, 0.12, '#bea36b', 'copper')
    rim.finish(wheel)
    wheel.position.set(s * 0.56, 0.405, 0.5)
    g.add(wheel)
    wheels.push(wheel)
  }
  return { g, wheels }
}
export function buildPeople(
  scene: T.Scene,
  id: PortId,
  plan: HarborPlan,
  materials: Paints,
  atlas: T.Texture | null = null,
) {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: atlas })
  const make = (cl: Clothes, role?: Station) => {
    const rig = person(cl, m, role ? faceFor(id, role) : undefined)
    scene.add(rig.mesh)
    return rig
  }
  const outfit = attire[id],
    local = make(outfit, locals[id])
  local.mesh.name = 'Dockside local'
  const keeper = make({ ...outfit, hat: '#354a49', coat: '#34665c', scarf: '#bb9866', style: 'bun' }, 'authority')
  keeper.mesh.position.set(plan.authority[0] + 0.77, 0, plan.authority[1] + 3.26)
  const vendor = make({ ...outfit, coat: '#a96f4f', hat: '#b38c5e', shirt: '#ded3ad', style: 'cap' }, 'market')
  vendor.mesh.position.set(plan.market[0] + 0.27, 0, plan.market[1] - 0.3)
  const buyer = make({ ...outfit, coat: '#657e6a', hat: '#71634e', scarf: '#ac8568', style: 'hood' })
  const smith = make({ ...outfit, coat: '#6b5442', shirt: '#ab9b7b', hat: '#4e5a5c', style: 'band' }, 'shipyard')
  smith.mesh.position.set(plan.yard[0] + 1.1, 0, plan.yard[1] + 2.45)
  const worker = make({ ...outfit, coat: '#53757c', hat: '#8b6c56', style: 'cap' })
  worker.mesh.position.set(plan.crew[0], 0, plan.crew[1])
  const carrier = make({ ...outfit, coat: '#866274', hat: '#746245', style: 'cap' })
  const marketWalk = circuit(
    [
      [plan.customer[0] + 1.6, plan.customer[1] + 2.1],
      plan.customer,
      [plan.customer[0] - 2.1, plan.customer[1] + 2.55],
    ],
    0.78,
    [5.8, 0.6, 1.2],
  )
  const loop = circuit(
    plan.porter,
    0.84,
    plan.porter.map((_, i) =>
      i === plan.porter.length - 2 ? 4.3 : i === Math.min(2, plan.porter.length - 2) ? 7.5 : 1.2,
    ),
  )
  const porterCart = id === 'sunstep' ? cart(materials) : null
  if (porterCart) scene.add(porterCart.g)
  const parcel = new T.Mesh(
    new T.BoxGeometry(0.2, 0.18, 0.18),
    new T.MeshStandardMaterial({ color: id === 'sunstep' ? '#d9ae54' : '#88b8ae', roughness: 0.62 }),
  )
  parcel.name = 'Goods changing hands'
  scene.add(parcel)
  const anchor = new T.Vector3()
  let elapsed = 0,
    steps = 0,
    wheel = 0
  function face(r: Rig, target: number, dt: number) {
    const d = Math.atan2(Math.sin(target - r.mesh.rotation.y), Math.cos(target - r.mesh.rotation.y))
    r.mesh.rotation.y += d * (1 - Math.exp(-dt * 5.3))
  }
  function update(dt: number) {
    elapsed += dt
    const route = loop(elapsed),
      depart = marketWalk(elapsed + 4.0)
    const unload =
      route.wait > 0 && Math.hypot(route.x - worker.mesh.position.x, route.z - worker.mesh.position.z) < 2.55
    local.mesh.position.set(route.x, 0, route.z)
    face(
      local,
      unload ? Math.atan2(worker.mesh.position.x - route.x, worker.mesh.position.z - route.z) : route.angle,
      dt,
    )
    steps += dt * route.walk * 5.65
    const exchange = unload ? Math.max(0, Math.sin(route.wait * 1.6)) : 0
    pose(
      local,
      steps,
      route.walk,
      porterCart ? 1 - exchange * 0.65 : 0,
      exchange,
      unload ? 0.2 : Math.sin(elapsed * 0.49) * 0.13,
      elapsed,
    )
    if (porterCart) {
      porterCart.g.position.copy(local.mesh.position)
      porterCart.g.rotation.y = local.mesh.rotation.y
      porterCart.g.translateZ(1.25)
      wheel += (dt * route.walk * 0.84) / 0.39
      porterCart.wheels.forEach((w) => (w.rotation.x = wheel))
    }
    face(
      worker,
      unload ? Math.atan2(route.x - worker.mesh.position.x, route.z - worker.mesh.position.z) : 1.76,
      dt,
    )
    pose(
      worker,
      0,
      0,
      0,
      unload ? Math.max(0, Math.sin(route.wait * 1.6 - 0.7)) : 0,
      Math.sin(elapsed * 0.7) * 0.1,
      elapsed + 0.6,
    )
    buyer.mesh.position.set(depart.x, 0, depart.z)
    const shopping = depart.index === 0 && depart.wait > 0
    face(buyer, shopping ? Math.PI : depart.angle, dt)
    const sale = shopping ? Math.sin(Math.min(1, depart.wait / 2) * Math.PI * 0.7) : 0
    pose(buyer, elapsed * 5.4, depart.walk, 0, sale * 0.76, 0, elapsed + 0.9)
    face(
      vendor,
      Math.atan2(buyer.mesh.position.x - vendor.mesh.position.x, buyer.mesh.position.z - vendor.mesh.position.z),
      dt,
    )
    pose(vendor, 0, 0, 0, sale, Math.sin(elapsed * 0.29) * 0.12, elapsed)
    parcel.visible = shopping
    if (shopping) {
      const u = T.MathUtils.smoothstep(depart.wait, 1.1, 3.3)
      parcel.position.lerpVectors(vendor.mesh.position, buyer.mesh.position, u)
      parcel.position.y = 1.24 + Math.sin(u * Math.PI) * 0.13
    }
    const ca = elapsed * 0.17
    carrier.mesh.position.set(
      plan.customer[0] + 2.2 + Math.sin(ca) * 1.08,
      0,
      plan.customer[1] + 2.95 + Math.cos(ca) * 0.56,
    )
    carrier.mesh.rotation.y = Math.atan2(Math.cos(ca) * 1.08, -Math.sin(ca) * 0.56)
    pose(carrier, elapsed * 2.6, 0.33, 0, 0, Math.sin(ca) * 0.17, elapsed + 1.6)
    keeper.mesh.rotation.y = Math.sin(elapsed * 0.24) * 0.22
    pose(
      keeper,
      0,
      0,
      0,
      0.1 + Math.max(0, Math.sin(elapsed * 0.6)) * 0.2,
      Math.sin(elapsed * 0.55) * 0.27,
      elapsed + 1,
    )
    pose(smith, 0, 0, 0, 0.28 + Math.abs(Math.sin(elapsed * 2.2)) * 0.71, 0.15, elapsed)
    anchor.copy(local.mesh.position)
    anchor.y = 2.05
  }
  update(0.016)
  return { update, anchor, local: local.mesh, keeper: keeper.mesh, vendor: vendor.mesh, smith: smith.mesh }
}

/** The person at a service station has an articulated rig and turns to the approaching captain. */
export function stationArtisan(
  scene: T.Scene,
  port: PortId,
  role: 'market' | 'authority' | 'civic' | 'shipyard',
  location: V2,
  atlas: T.Texture,
) {
  const outfit = attire[port]
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.81, map: atlas })
  const byRole: Record<typeof role, Partial<Clothes>> = {
    market: { coat: '#9a714e', hat: '#a67d50', shirt: '#e0c29b' },
    authority: { coat: '#355c5a', hat: '#425b55', scarf: '#c9a466', style: 'bun' },
    civic: { coat: '#64775b', shirt: '#d5c7a7', scarf: '#9d715c' },
    shipyard: { coat: '#73533f', hat: '#5b6159', shirt: '#bea783', style: 'band' },
  }
  const sameDockworker =
    (role === 'civic' && port === 'sunstep') ||
    (role === 'market' && (port === 'copperfall' || port === 'glasshouse')) ||
    (role === 'authority' && port === 'meridian')
  const worker = person(sameDockworker ? outfit : { ...outfit, ...byRole[role] }, material, faceFor(port, role))
  worker.mesh.position.set(location[0], 0, location[1])
  scene.add(worker.mesh)
  let elapsed = 0
  return {
    mesh: worker.mesh,
    update(dt: number, viewer: T.Vector3) {
      elapsed += dt
      const angle = Math.atan2(viewer.x - worker.mesh.position.x, viewer.z - worker.mesh.position.z)
      const gaze = Math.max(-0.56, Math.min(0.56, angle))
      const rhythm = role === 'shipyard' ? 2.2 : role === 'market' ? 1.37 : 0.74
      const reach = 0.12 + Math.max(0, Math.sin(elapsed * rhythm)) * 0.67
      worker.mesh.rotation.y = gaze * 0.43
      pose(worker, 0, 0, 0, reach, gaze * 0.56, elapsed)
    },
  }
}

export function marketVisitor(scene: T.Scene, id: PortId, end: V2, front: number, atlas: T.Texture) {
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.79, map: atlas })
  const attireHere = id === 'sunstep' ? attire[id] : { ...attire[id], coat: '#64775b', scarf: '#997259' }
  const visitor = person(attireHere, material, faceFor(id, 'civic'))
  scene.add(visitor.mesh)
  const destination: V2 = [end[0] + 0.16, end[1] + 1.11]
  const route = circuit(
    [[-1.65, front - 1.2], [0.22, 0.8], destination, [1.53, 1.32]],
    0.72,
    [0.13, 4.15, 0.13, 1.32],
  )
  const anchor = new T.Vector3(),
    parcel = new T.Mesh(
      new T.BoxGeometry(0.19, 0.16, 0.2),
      new T.MeshStandardMaterial({ color: id === 'sunstep' ? '#d7ae4f' : '#8cac9b' }),
    )
  scene.add(parcel)
  let t = 0
  function update(dt: number) {
    t += dt
    const step = route(t + 2.32),
      atCounter = step.index === 1 && step.wait > 0
    visitor.mesh.position.set(step.x, 0, step.z)
    const angle = atCounter ? Math.PI : step.angle,
      delta = Math.atan2(Math.sin(angle - visitor.mesh.rotation.y), Math.cos(angle - visitor.mesh.rotation.y))
    visitor.mesh.rotation.y += delta * (1 - Math.exp(-dt * 5.7))
    pose(
      visitor,
      t * 5.25,
      step.walk,
      0,
      atCounter ? Math.max(0, Math.sin(step.wait * 0.78)) : 0,
      Math.sin(t * 0.28) * 0.11,
      t,
    )
    parcel.visible = atCounter
    if (atCounter) {
      const u = T.MathUtils.smoothstep(step.wait, 0.65, 2.7)
      parcel.position.set(end[0] + 0.19, 1.14 + 0.16 * Math.sin(Math.PI * u), end[1] - 0.19 + u * 1.04)
    }
    anchor.copy(visitor.mesh.position)
    anchor.y = 1.98
  }
  update(0.016)
  return { mesh: visitor.mesh, anchor, update }
}
