import * as T from 'three'
import { buildAirframe, FLOATS_PER_VERTEX } from './fleet/airframes'
import { GUN_POSITIONS } from './drill'
import { artTexture } from './voxel/blocks'

/** Display the Fleet Studio's fitted Wayfarer at any camera angle. The same
 * airframe carries its paint, solar sail plan and gun stations into the harbor. */
export class FlightHull extends T.Group {
  private cloth = artTexture('fleet-sailcloth.webp')
  private paint = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.78 })
  private brass = new T.MeshStandardMaterial({
    vertexColors: true,
    side: T.DoubleSide,
    roughness: 0.51,
    metalness: 0.25,
  })
  private canvas = new T.MeshStandardMaterial({
    map: this.cloth,
    vertexColors: true,
    side: T.DoubleSide,
    roughness: 0.9,
  })
  private lamp = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide })
  private rig = new T.Group()
  private propellers = [new T.Group(), new T.Group()]
  private gunCount = -1
  private damage = -1
  constructor() {
    super()
    this.cloth.magFilter = T.LinearFilter
    this.scale.setScalar(1 / 8)
    this.add(this.rig)
  }
  updateFit(guns: number, damage: number) {
    if (this.gunCount === guns && this.damage === damage) return
    this.clearFit()
    this.gunCount = guns
    this.damage = damage
    const data = buildAirframe('wayfarer', GUN_POSITIONS.slice(0, guns))
    const parts = new Map<string, { geometry: number[]; material: T.Material; parent: T.Group }>()
    const color = new T.Color()
    for (let t = 0; t < data.length; t += 3 * FLOATS_PER_VERTEX) {
      const surface = data[t + 11],
        motion = data[t + 12],
        isCanvas = surface >= 3 && surface <= 6
      const isRotor = motion === 1,
        rotor = data[t + 15] < 0 ? 0 : 1
      const material = isCanvas ? this.canvas : surface === 7 ? this.lamp : surface === 1 ? this.brass : this.paint
      if (
        damage &&
        isCanvas &&
        surface !== 6 &&
        data[t + 10] > 0.99 - damage * 0.12 &&
        (t / (3 * FLOATS_PER_VERTEX)) % 5 < damage
      )
        continue
      const parent = isRotor ? this.propellers[rotor] : this.rig
      if (isRotor) parent.position.set(data[t + 13], data[t + 14], data[t + 15])
      const key = material.uuid + (isRotor ? rotor : '')
      let part = parts.get(key)
      if (!part) {
        part = { geometry: [], material, parent }
        parts.set(key, part)
      }
      for (let i = t; i < t + 3 * FLOATS_PER_VERTEX; i += FLOATS_PER_VERTEX) {
        const offset = isRotor ? parent.position : undefined
        color.setRGB(data[i + 6], data[i + 7], data[i + 8], T.SRGBColorSpace)
        let u = data[i + 9],
          v = data[i + 10]
        if (isCanvas) {
          const swatch = surface - 3
          u = ((swatch % 2) + 0.02 + 0.96 * u) * 0.5
          v = 1 - (Math.floor(swatch / 2) + 0.02 + 0.96 * v) * 0.5
        }
        part.geometry.push(
          data[i] - (offset?.x ?? 0),
          data[i + 1] - (offset?.y ?? 0),
          data[i + 2] - (offset?.z ?? 0),
          data[i + 3],
          data[i + 4],
          data[i + 5],
          color.r,
          color.g,
          color.b,
          u,
          v,
        )
      }
    }
    this.rig.add(...this.propellers)
    for (const { geometry, material, parent } of parts.values()) {
      const buffer = new T.InterleavedBuffer(new Float32Array(geometry), 11)
      const g = new T.BufferGeometry()
      for (const [name, size, start] of [
        ['position', 3, 0],
        ['normal', 3, 3],
        ['color', 3, 6],
        ['uv', 2, 9],
      ] as const)
        g.setAttribute(name, new T.InterleavedBufferAttribute(buffer, size, start))
      const mesh = new T.Mesh(g, material)
      mesh.castShadow = mesh.receiveShadow = true
      parent.add(mesh)
    }
    const shade = 1 - 0.13 * damage
    this.canvas.color.setRGB(shade, shade, shade)
    this.paint.color.setRGB(shade, shade, shade)
    this.lamp.color.setScalar(1 - 0.26 * damage)
  }
  turnProps(time: number) {
    this.propellers[0].rotation.y = time * 11
    this.propellers[1].rotation.y = -time * 11
  }
  private clearFit() {
    this.rig.traverse((object) => {
      if (object instanceof T.Mesh) object.geometry.dispose()
    })
    for (const prop of this.propellers) prop.clear()
    this.rig.clear()
  }
  dispose() {
    this.clearFit()
    for (const mat of [this.paint, this.brass, this.canvas, this.lamp]) mat.dispose()
    this.cloth.dispose()
  }
}
