import * as T from 'three'
import { artTexture, Blocks, disposeMeshes, dressMaterials, paints } from './blocks'
import { walkCamera } from './walk-camera'
import { stationArtisan, marketVisitor } from './people'
import { roomPlan, type Station, type RoomTarget } from './workroom-plan'
import { encloseRoom } from './workroom-shell'
import { equipRoom } from './workroom-objects'
import type { GameState } from '../model'

export function openRoomWorld(
  root: HTMLElement,
  state: GameState,
  station: Station,
  activate: (target: RoomTarget) => void,
) {
  const viewport = root.querySelector<HTMLElement>('.atelier-view')!,
    canvas = viewport.querySelector('canvas')!
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.14
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  const scene = new T.Scene(),
    materials = paints(),
    textures: T.Texture[] = []
  const { port } = state,
    plan = roomPlan(port, station)
  const night = state.mission === 'lit' && (port === 'sunstep' || port === 'glasshouse')
  const sky = artTexture(night ? 'voxel-night.webp' : 'voxel-sky.webp')
  sky.mapping = T.EquirectangularReflectionMapping
  scene.background = sky
  scene.environment = sky
  scene.environmentIntensity = night ? 0.15 : 0.36
  scene.backgroundIntensity = night ? 0.72 : 1.11
  scene.backgroundRotation.y = port === 'meridian' ? 1.06 : 0.48
  textures.push(sky)
  dressMaterials(materials, textures)
  const blocks = new Blocks(materials)
  encloseRoom(scene, blocks, materials, port, station, plan, textures)
  const animate = equipRoom(scene, blocks, materials, port, station, plan)
  blocks.finish(scene)
  const atlas = artTexture('crew-faces.webp')
  textures.push(atlas)
  const artisan = stationArtisan(scene, port, station, plan.worker, atlas)
  const buyer = station === 'market' ? marketVisitor(scene, port, plan.desk, plan.d / 2, atlas) : null
  const hemi = new T.HemisphereLight(night ? '#a1afd3' : '#cce1ec', '#b9a18b', night ? 0.76 : 1.32)
  const sun = new T.DirectionalLight(night ? '#9ab5ed' : '#ffdfab', night ? 1.65 : 4.25)
  sun.position.set(-12, 8, -3)
  sun.target.position.set(2, 0.7, -1)
  sun.castShadow = true
  sun.shadow.mapSize.set(1536, 1536)
  Object.assign(sun.shadow.camera, { left: -13, right: 13, bottom: -12, top: 12, near: 0.1, far: 40 })
  sun.shadow.bias = -0.00019
  sun.shadow.normalBias = 0.02
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(hemi, sun, sun.target)
  const fill = new T.PointLight(night ? '#eeb57a' : '#ffe0b1', night ? 14 : 7, 13, 2)
  fill.position.set(-1.4, 3.38, -1.16)
  scene.add(fill)
  const pins = new Map<RoomTarget, T.Vector3>([
    ['worker', new T.Vector3(plan.worker[0], 1.97, plan.worker[1])],
    ['counter', new T.Vector3(plan.desk[0] - 0.65, 1.28, plan.desk[1] + 0.22)],
    ['door', new T.Vector3(plan.entry[0], 1.83, plan.entry[1] - 0.1)],
  ])
  if (buyer) pins.set('guest', buyer.anchor)
  const box = (x: number, y: number, z: number, w: number, h: number, d: number) =>
    new T.Box3().setFromCenterAndSize(new T.Vector3(x, y, z), new T.Vector3(w, h, d))
  const camera = walkCamera<RoomTarget>(
    root,
    viewport,
    renderer,
    {
      start: [plan.spawn[0], 1.67, plan.spawn[1]],
      look: [plan.look[0], 1.72, plan.look[1]],
      decks: plan.decks,
      obstacles: plan.blocks,
      pins,
      targets: [
        { place: 'counter', hitbox: box(plan.desk[0], 0.55, plan.desk[1], plan.deskWidth, 1.1, 0.87) },
        { place: 'door', hitbox: box(plan.entry[0], 1.3, plan.entry[1], 2.18, 2.6, 0.44) },
      ],
      bodies: buyer
        ? [
            ['worker', artisan.mesh],
            ['guest', buyer.mesh],
          ]
        : [['worker', artisan.mesh]],
      threshold(position, _dx, dz) {
        return dz > 0 && Math.abs(position.x - plan.entry[0]) < 0.89 && position.z > plan.entry[1] - 0.28
          ? 'door'
          : null
      },
    },
    activate,
  )
  root.classList.add('atelier-ready')
  let frame = 0,
    last = 0,
    time = 0,
    done = false
  function draw(now: number) {
    if (done) return
    frame = requestAnimationFrame(draw)
    if (document.hidden) {
      last = now
      return
    }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    if (!camera.blocked()) {
      time += dt
      artisan.update(dt, camera.camera.position)
      buyer?.update(dt)
      animate(time)
    }
    camera.update(dt)
    if (!done) renderer.render(scene, camera.camera)
  }
  frame = requestAnimationFrame(draw)
  return {
    framePlace: camera.framePlace,
    dispose() {
      done = true
      cancelAnimationFrame(frame)
      camera.dispose()
      sun.shadow.dispose()
      disposeMeshes(scene, materials, textures)
      renderer.dispose()
      renderer.forceContextLoss()
      root.classList.remove('atelier-ready')
    },
  }
}
