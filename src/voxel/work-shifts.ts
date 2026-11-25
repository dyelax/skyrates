import * as T from 'three'
import { Blocks, type Paints, type V3 } from './blocks'
import { crate } from './architecture'
import type { PortId } from '../data'

/** Machinery tied to the work carried out at each berth. All of it runs on the same harbor clock. */
export function workShifts(scene: T.Scene, b: Blocks, materials: Paints, id: PortId, night: boolean) {
  const beats: ((time: number) => void)[] = []
  if (id === 'sunstep') {
    const from: V3 = [-19.4, 5.9, -8.3],
      to: V3 = [9.1, 5.0, -1.5]
    b.beam(from, to, 0.045, '#564c43', 'iron')
    const cage = new T.Group(),
      parts = new Blocks(materials)
    for (const side of [-1, 1]) {
      parts.beam([side * 0.45, -1.7, -0.25], [0, -0.13, 0], 0.038, '#504c43', 'iron')
      parts.beam([side * 0.45, -1.7, 0.25], [0, -0.13, 0], 0.038, '#504c43', 'iron')
    }
    parts.box(0, -1.78, 0, 1.12, 0.13, 0.85, '#54463d', 'timber')
    crate(parts, 0, 0, 0.89, -1.72)
    parts.box(0, 0, 0, 0.28, 0.2, 0.28, '#99764e', 'copper')
    parts.finish(cage)
    scene.add(cage)
    beats.push((time) => {
      const u = (1 - Math.cos(time * 0.078 + 0.49)) / 2
      cage.position.set(
        T.MathUtils.lerp(from[0], to[0], u),
        T.MathUtils.lerp(from[1], to[1], u) - Math.sin(Math.PI * u) * 0.1,
        T.MathUtils.lerp(from[2], to[2], u),
      )
      cage.rotation.z = Math.sin(time * 0.77) * 0.024
    })
  }
  if (id === 'glasshouse') {
    // Recirculating runoff from a pressure cistern. Thin glassy rivulets scatter sunlight.
    for (let i = 0; i < 4; i++) {
      const x = 6.0 + i * 0.43,
        z = -31 - i * 0.27,
        h = 4 + i * 0.73
      b.box(x, h + 0.14, z, 0.39, 0.29, 0.68, '#988769', 'copper')
      const mat = new T.MeshStandardMaterial({
        color: i % 2 ? '#b8e5df' : '#7fbace',
        transparent: true,
        opacity: 0.49,
        roughness: 0.18,
        metalness: 0.23,
        depthWrite: false,
      })
      const stream = new T.Mesh(new T.BoxGeometry(0.31, 19, 0.17), mat)
      stream.position.set(x, h - 9.5, z + 0.3)
      scene.add(stream)
      beats.push((t) => {
        mat.opacity = 0.4 + 0.11 * Math.sin(t * 1.8 + i)
        stream.scale.x = 1 + Math.sin(t * 2.1 + i) * 0.18
      })
    }
  }
  if (id === 'copperfall') {
    // The overhead hoist has a counterweight and a visible moving sling.
    const truck = new T.Group(),
      parts = new Blocks(materials)
    b.beam([2.7, 9.06, -6.7], [12.8, 8.97, -10.6], 0.28, '#5b5554', 'iron')
    parts.box(0, 0, 0, 0.69, 0.44, 0.55, '#896a4d', 'copper')
    for (const s of [-1, 1]) parts.beam([s * 0.19, -0.1, 0], [s * 0.39, -2.8, 0], 0.035, '#4d4747', 'iron')
    parts.box(0, -2.84, 0, 1.34, 0.25, 0.46, '#6a685b', 'iron')
    parts.finish(truck)
    scene.add(truck)
    beats.push((t) => {
      const a = (1 + Math.sin(t * 0.11)) * 0.5
      truck.position.set(2.85 + a * 9.6, 8.79, -6.75 - a * 3.69)
    })
  }
  if (night) {
    const beamMaterial = new T.MeshBasicMaterial({
      color: '#ffda89',
      transparent: true,
      opacity: 0.083,
      depthWrite: false,
      blending: T.AdditiveBlending,
    })
    const g = new T.ConeGeometry(2.45, 44, 20, 1, true)
    g.rotateZ(Math.PI / 2)
    g.translate(22, 0, 0)
    const light = new T.Mesh(g, beamMaterial)
    light.position.set(
      id === 'glasshouse' ? 1 : -5.1,
      id === 'glasshouse' ? 10.18 : 8,
      id === 'glasshouse' ? -10.8 : -10.15,
    )
    scene.add(light)
    beats.push((t) => {
      light.rotation.y = t * 0.105
      light.rotation.z = 0.032
    })
  }
  return (time: number) => beats.forEach((beat) => beat(time))
}
