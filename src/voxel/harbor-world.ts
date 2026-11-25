import { seasonPort } from './atmosphere'
import * as T from 'three'
import { artTexture, disposeMeshes, dressMaterials, paints, type Place } from './blocks'
import { dressPort } from './surfaces'
import { buildPeople } from './people'
import { buildPort, plans } from './ports'
import { walkCamera } from './walk-camera'
import type { GameState } from '../model'

export interface HarborWorld {
  dispose(): void
  framePlace(place: Place): void
  home(): void
}
export function mountWorld(root: HTMLElement, state: GameState, activate: (place: Place) => void): HarborWorld {
  const viewport = root.querySelector<HTMLElement>('.walk-view')!,
    canvas = viewport.querySelector('canvas')!
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.93
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  const id = state.port,
    plan = plans[id],
    night = state.mission === 'lit' && (id === 'sunstep' || id === 'glasshouse')
  const scene = new T.Scene(),
    materials = paints(),
    textures: T.Texture[] = []
  const saveKey = id + (night ? '-night' : '-day')
  const sky = artTexture(night ? 'voxel-night.webp' : 'voxel-sky.webp')
  sky.mapping = T.EquirectangularReflectionMapping
  textures.push(sky)
  scene.background = sky
  scene.backgroundRotation.y = id === 'meridian' ? 0.43 : id === 'glasshouse' ? 2.5 : -0.5
  scene.backgroundIntensity = night ? 0.68 : 1.15
  scene.environment = sky
  scene.environmentIntensity = night ? 0.18 : 0.41
  scene.fog = new T.FogExp2(night ? '#45486b' : plan.hue, 0.0079)
  dressMaterials(materials, textures)
  const hemi = new T.HemisphereLight(
    night ? '#9daedc' : plan.hemisphere,
    night ? '#61525c' : '#b9a09c',
    night ? 0.84 : 0.95,
  )
  const sun = new T.DirectionalLight(night ? '#b2c8f1' : plan.sun, night ? 1.66 : 3.35)
  sun.position.set(-23, night ? 27 : 15, -11)
  sun.target.position.set(0, 1, -2)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 29, bottom: -29, near: 0.5, far: 106 })
  sun.shadow.normalBias = 0.045
  sun.shadow.bias = -0.00023
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(hemi, sun, sun.target)
  const rim = new T.DirectionalLight(night ? '#7f97b3' : '#dda8b1', night ? 0.38 : 0.32)
  rim.position.set(20, 10, -24)
  scene.add(rim)
  const atlas = artTexture('crew-faces.webp')
  textures.push(atlas)
  const set = buildPort(scene, id, materials, night),
    people = buildPeople(scene, id, plan, materials, atlas)
  const weather = seasonPort(state, scene, hemi, sun, materials)
  dressPort(scene, id, plan, textures, night)
  const glow = new T.PointLight(id === 'copperfall' ? '#ff8f48' : '#ffd492', night ? 12 : 0.8, 10, 2)
  glow.position.set(...([plan.authority[0], 2.7, plan.authority[1] + 4.1] as const))
  scene.add(glow)
  if (id === 'copperfall' || id === 'glasshouse') {
    const forge = new T.PointLight('#ff913c', 43, 10, 2)
    forge.position.set(plan.yard[0], 1.8, plan.yard[1] + 2.55)
    scene.add(forge)
  }
  const probe = new T.WebGLCubeRenderTarget(96, {
    generateMipmaps: true,
    minFilter: T.LinearMipmapLinearFilter,
    type: T.HalfFloatType,
  })
  const probeCamera = new T.CubeCamera(0.3, 190, probe)
  probeCamera.position.set(0, 3, -2)
  let probeReady = false
  const pins = new Map(set.sites.map((site) => [site.place, site.pin]))
  pins.set('local', people.anchor)
  const targets = set.sites.map((site) => ({
    place: site.place,
    hitbox: new T.Box3().setFromCenterAndSize(site.center, site.size),
  }))
  const doors = set.sites
    .filter((site) => site.place !== 'ship')
    .map((site) => {
      const wall = set.blockades.find((obstacle) => obstacle.x === site.center.x && obstacle.z === site.center.z)
      return { place: site.place, x: site.center.x, z: site.center.z + (wall?.d ?? site.size.z) / 2 }
    })
  const camera = walkCamera(
    root,
    viewport,
    renderer,
    {
      start: plan.start,
      look: plan.look,
      decks: plan.decks,
      obstacles: set.blockades,
      pins,
      targets,
      bodies: [
        ['local', people.local],
        ['authority', people.keeper],
        ['market', people.vendor],
        ['shipyard', people.smith],
      ],
      saveKey,
      threshold(position, _dx, dz) {
        if (dz >= -0.18) return null
        // Stop just outside the doorway. On exit the captain can turn or back away directly.
        for (const door of doors) {
          const clearance = position.z - door.z
          if (Math.abs(position.x - door.x) < 0.65 && clearance >= 0 && clearance < 0.5) return door.place
        }
        return null
      },
    },
    activate,
  )
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let stopped = false,
    frame = 0,
    last = 0,
    displayTime = 0
  root.classList.add('world-ready')
  const bg = new T.Color(night ? '#25274d' : plan.hue)
  renderer.setClearColor(bg)
  function draw(t: number) {
    if (stopped) return
    frame = requestAnimationFrame(draw)
    if (document.hidden) {
      last = t
      camera.update(0)
      return
    }
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016)
    last = t
    if (!camera.blocked()) {
      displayTime += dt
      people.update(dt)
      set.moving(displayTime)
    }
    camera.update(dt)
    if (stopped) return
    if (!probeReady && sky.image?.width) {
      // The reflection sees the actual lanterns, hulls and painted sky from the quay.
      probeReady = true
      probeCamera.update(renderer, scene)
      scene.environment = probe.texture
    }
    weather?.update(reduced.matches ? 0 : dt)
    renderer.render(scene, camera.camera)
  }
  frame = requestAnimationFrame(draw)
  return {
    home: camera.home,
    framePlace: camera.framePlace,
    dispose() {
      stopped = true
      cancelAnimationFrame(frame)
      camera.dispose()
      weather?.dispose()
      probe.dispose()
      disposeMeshes(scene, materials, textures)
      renderer.dispose()
      renderer.forceContextLoss()
      root.classList.remove('world-ready')
    },
  }
}
