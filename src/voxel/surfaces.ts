import * as T from 'three'
import type { PortId } from '../data'
import type { HarborPlan } from './ports'
import { artTexture } from './blocks'

const walls: Record<PortId, [number, number, number, number]> = {
  // Width, height, distance from civic-building center, vertical center.
  sunstep: [6.18, 4.36, 2.94, 2.29],
  glasshouse: [4.4, 2.77, 2.74, 1.45],
  copperfall: [5.85, 3.6, 2.92, 1.9],
  meridian: [6.4, 3.47, 3.1, 1.82],
}

/** A fine relief on a solid landmark. Stepped masonry, frames, roof and trim remain independent geometry. */
export function dressPort(scene: T.Scene, id: PortId, plan: HarborPlan, textures: T.Texture[], night: boolean) {
  const [w, h, d, cy] = walls[id],
    face = artTexture('facade-' + id + '.webp')
  const relief = artTexture('relief-' + id + '.webp', false)
  const material = new T.MeshStandardMaterial({
    map: face,
    roughness: 0.76,
    metalness: 0.08,
    displacementMap: relief,
    displacementScale: 0.095,
    bumpMap: relief,
    bumpScale: 0.05,
  })
  if (night) {
    const lightMap = artTexture('windows-' + id + '.webp', false)
    material.emissive.set('#ffbd73')
    material.emissiveMap = lightMap
    material.emissiveIntensity = 0.79
    textures.push(lightMap)
  }
  const wall = new T.Mesh(new T.PlaneGeometry(w, h, 72, 48), material)
  wall.position.set(plan.authority[0], cy, plan.authority[1] + d)
  wall.receiveShadow = true
  scene.add(wall)
  textures.push(face, relief)

  const pavers = artTexture('paving-' + id + '.webp'),
    wood = id === 'copperfall' ? pavers : artTexture('paving-copperfall.webp')
  textures.push(pavers)
  if (pavers !== wood) textures.push(wood)
  for (const tile of [pavers, wood]) {
    tile.wrapS = tile.wrapT = T.RepeatWrapping
    tile.anisotropy = 4
  }
  const stoneMat = new T.MeshStandardMaterial({
    map: pavers,
    roughness: 0.81,
    metalness: 0.055,
    bumpMap: pavers,
    bumpScale: 0.043,
  })
  const timberMat = new T.MeshStandardMaterial({
    map: wood,
    roughness: 0.75,
    metalness: 0.03,
    bumpMap: wood,
    bumpScale: 0.034,
  })
  plan.decks.forEach((deck, index) => {
    const plank = !!deck.timber,
      g = new T.PlaneGeometry(deck.w, deck.d)
    g.rotateX(-Math.PI / 2)
    const uv = g.getAttribute('uv'),
      position = g.getAttribute('position')
    for (let i = 0; i < uv.count; i++) {
      const x = position.getX(i) + deck.x,
        z = position.getZ(i) + deck.z
      uv.setXY(i, x / (plank ? 4.2 : 3.4), z / (plank ? 3.1 : 3.4))
    }
    const pavement = new T.Mesh(g, plank ? timberMat : stoneMat)
    pavement.position.set(deck.x, 0.046 + index * 0.0015, deck.z)
    pavement.receiveShadow = true
    scene.add(pavement)
  })
  if (!plan.decks.some((d) => d.timber)) timberMat.dispose()
  if (plan.decks.every((d) => d.timber)) stoneMat.dispose()
}
