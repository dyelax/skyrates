import * as T from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { artTexture, disposeMeshes } from './voxel/blocks'
import { FlightHull } from './world-flight-hull'
import { stationArtisan } from './voxel/people'
import { WORLD_TOWNS, type WorldPose } from './world-flight'
import type { PortId } from './data'
import type { FlightLight } from './world-flight-light'

type Point = { x: number; y: number }
const unit = 8

export class FlightTown {
  readonly renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 550)
  private townTextures: T.Texture[] = []
  private people: ReturnType<typeof stationArtisan>[] = []
  private port?: PortId
  private townScene = new T.Scene()
  private pending?: PortId
  private generation = 0
  private attempts = new Map<PortId, { count: number; after: number }>()
  private compiling = 0
  private dead = false
  private wayfarer: FlightHull
  private rotor?: T.Object3D
  private hemi?: T.HemisphereLight
  private sun?: T.DirectionalLight
  private lamps: T.PointLight[] = []
  private halos: T.Sprite[] = []
  private glow = new Map<T.MeshStandardMaterial, number>()
  private garden?: T.Object3D
  private lastShadow = -Infinity
  private width = 0
  private height = 0
  private duskColor = new T.Color('#ffad65')
  private noonColor = new T.Color('#fff0cf')
  private nightColor = new T.Color('#91acd9')
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    this.renderer.setClearColor(0, 0)
    this.renderer.outputColorSpace = T.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    const scene = this.scene
    this.hemi = new T.HemisphereLight('#d9e9ff', '#92837b', 1.35)
    scene.add(this.hemi)
    const sun = new T.DirectionalLight('#ffe3b0', 2.8)
    sun.position.set(-24, 25, 22)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 0.5, far: 125 })
    sun.shadow.camera.updateProjectionMatrix()
    sun.shadow.bias = -0.00035
    sun.shadow.normalBias = 0.065
    scene.add(sun)
    this.sun = sun
    // Keep the lighting program stable when the next town comes into view.
    for (let i = 0; i < 4; i++) {
      const lamp = new T.PointLight('#ffc27a', 0, 8, 2)
      this.lamps.push(lamp)
      scene.add(lamp)
    }
    this.wayfarer = new FlightHull()
    scene.add(this.wayfarer)
    scene.add(this.townScene)
  }
  private reset() {
    this.halos[0]?.material.dispose()
    // Town models and artisan meshes have their own resources. The airship and its
    // materials stay mounted while the next region streams in.
    if (this.port) disposeMeshes(this.townScene, {}, this.townTextures)
    this.townScene.clear()
    this.townTextures = []
    this.people = []
    this.halos = []
    this.glow.clear()
    this.rotor = undefined
    this.port = undefined
  }
  request(port: PortId) {
    if (this.dead || this.pending === port || !this.available) return
    if (this.port === port) {
      if (this.pending) {
        this.generation++
        this.pending = undefined
      }
      return
    }
    const attempt = this.attempts.get(port)
    if (attempt && performance.now() < attempt.after) return
    this.pending = port
    const n = ++this.generation
    const url = new URL(import.meta.env.BASE_URL + 'art/flight-town-' + port + '.glb', document.baseURI)
    url.searchParams.set('v', '3')
    void new GLTFLoader()
      .loadAsync(url.href)
      .then(async ({ scene: model }) => {
        if (n === this.generation) {
          this.compiling++
          try {
            // Start shader work offscreen while the calibrated view remains available.
            await this.renderer.compileAsync(model, this.camera, this.scene)
          } catch (error) {
            disposeMeshes(model, {}, this.modelTextures(model))
            throw error
          } finally {
            this.compiling--
            if (this.dead && !this.compiling) this.releaseRenderer()
          }
        }
        if (n !== this.generation) {
          disposeMeshes(model, {}, this.modelTextures(model))
          return
        }
        this.reset()
        this.create(port, model)
        this.lastShadow = -Infinity
        this.attempts.delete(port)
      })
      .catch(() => {
        if (n !== this.generation) return
        const count = (attempt?.count ?? 0) + 1
        this.attempts.set(port, {
          count,
          after: performance.now() + Math.min(60, 4 * 2 ** Math.min(count - 1, 4)) * 1000,
        })
      })
      .finally(() => {
        if (n === this.generation) this.pending = undefined
      })
  }
  private modelTextures(model: T.Group) {
    const maps = new Set<T.Texture>()
    model.traverse((obj) => {
      if (obj instanceof T.Mesh)
        for (const material of Array.isArray(obj.material) ? obj.material : [obj.material])
          for (const value of Object.values(material)) if (value instanceof T.Texture) maps.add(value)
    })
    return [...maps]
  }
  ready(port: PortId) {
    return this.port === port
  }
  get available() {
    return !this.renderer.getContext().isContextLost()
  }
  private create(port: PortId, model: T.Group) {
    this.port = port
    const scene = this.townScene,
      town = WORLD_TOWNS[port]
    const atlas = artTexture('crew-faces.webp')
    this.townTextures.push(atlas)
    this.townTextures.push(...this.modelTextures(model))
    scene.add(model)
    model.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material])
          if (m instanceof T.MeshStandardMaterial) {
            if (m.emissive.getHex() !== 0) this.glow.set(m, m.emissiveIntensity)
            if (m.map) {
              m.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
            }
          }
      }
      if (obj.name.includes('mill-sails')) this.rotor = obj
    })
    this.garden = model.getObjectByName('winter-glass-repaired')
    for (const site of town.sites) {
      const anchor = model.getObjectByName('npc-' + site.id),
        x = anchor?.position.x ?? (site.position.x - town.center.x) / unit + 0.7,
        z = anchor?.position.z ?? (site.position.y - town.center.y) / unit + 1.55
      const role =
        site.id === 'dockworker'
          ? port === 'sunstep'
            ? 'civic'
            : port === 'meridian'
              ? 'authority'
              : 'market'
          : site.id
      const artisan = stationArtisan(scene, port, role, [x, z], atlas)
      this.people.push(artisan)
    }
    const sockets: T.Vector3[] = []
    model.updateMatrixWorld(true)
    model.traverse((obj) => {
      if (obj.name.startsWith('practical-') && sockets.length < 4)
        sockets.push(obj.getWorldPosition(new T.Vector3()))
    })
    if (!sockets.length) {
      for (const site of town.sites.filter((site) => site.id !== 'civic')) {
        sockets.push(
          new T.Vector3(
            (site.position.x - town.center.x) / unit,
            2.15,
            (site.position.y - town.center.y) / unit + 0.85,
          ),
        )
      }
    }
    const lens = document.createElement('canvas')
    lens.width = lens.height = 32
    const brush = lens.getContext('2d')!
    const bloom = brush.createRadialGradient(16, 16, 0, 16, 16, 16)
    bloom.addColorStop(0, 'rgba(255,230,170,.90)')
    bloom.addColorStop(0.14, 'rgba(255,194,103,.72)')
    bloom.addColorStop(0.42, 'rgba(241,153,63,.22)')
    bloom.addColorStop(1, 'rgba(255,150,61,0)')
    brush.fillStyle = bloom
    brush.fillRect(0, 0, 32, 32)
    const haloMap = new T.CanvasTexture(lens)
    this.townTextures.push(haloMap)
    const lanternMaterial = new T.SpriteMaterial({
      map: haloMap,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    })
    for (const [index, pos] of sockets.entries()) {
      const halo = new T.Sprite(lanternMaterial)
      halo.position.copy(pos)
      halo.scale.setScalar(2.45)
      scene.add(halo)
      this.halos.push(halo)
      this.lamps[index].position.copy(pos)
    }
  }
  draw(
    port: PortId,
    center: Point,
    scale: number,
    elev: number,
    yaw: number,
    w: number,
    h: number,
    dt: number,
    now: number,
    player: WorldPose,
    repaired: boolean,
    light: FlightLight,
    reduced: boolean,
    cannons: number,
    damage: number,
    playerVisible: boolean,
  ) {
    this.townScene.visible =
      this.port === port &&
      Math.hypot(center.x - WORLD_TOWNS[port].center.x, center.y - WORLD_TOWNS[port].center.y) <
        Math.hypot(w, h) / (2 * scale * Math.sin(elev)) + 360
    const ratio = Math.min(2, devicePixelRatio || 1, Math.sqrt(2100000 / (w * h)))
    if (this.width !== w || this.height !== h || ratio !== this.renderer.getPixelRatio()) {
      this.renderer.setPixelRatio(ratio)
      this.renderer.setSize(w, h, false)
      this.width = w
      this.height = h
      this.lastShadow = -Infinity
    }
    const town = WORLD_TOWNS[port],
      x = (center.x - town.center.x) / unit,
      z = (center.y - town.center.y) / unit
    const cam = this.camera,
      extent = w / (unit * scale * 2)
    cam.left = -extent
    cam.right = extent
    cam.top = (extent * h) / w
    cam.bottom = -cam.top
    cam.updateProjectionMatrix()
    cam.position.set(
      x + 110 * Math.cos(elev) * Math.sin(yaw),
      110 * Math.sin(elev),
      z + 110 * Math.cos(elev) * Math.cos(yaw),
    )
    cam.lookAt(x, 0, z)
    this.wayfarer.visible = playerVisible
    this.wayfarer.updateFit(cannons, damage)
    this.wayfarer.turnProps(reduced ? 0 : now)
    this.wayfarer.position.set(
      (player.x - town.center.x) / unit,
      0.95 + player.heave * 0.1,
      (player.y - town.center.y) / unit,
    )
    this.wayfarer.rotation.set(
      (reduced ? 0 : player.heel) + damage * 0.055,
      -player.heading,
      reduced ? 0 : -player.heave * 0.017,
      'YXZ',
    )
    if (this.rotor) this.rotor.rotation.z = reduced ? 0 : now * 0.35
    if (this.garden) this.garden.visible = repaired
    if (this.sun && this.hemi) {
      const s = this.sun
      s.position.set(-25 + light.azimuth * 12, 11 + Math.max(0, light.height) * 21, 22)
      s.color
        .copy(this.noonColor)
        .lerp(this.duskColor, light.dusk * 0.93)
        .lerp(this.nightColor, light.night * 0.94)
      s.intensity = (2.92 - 2.46 * light.night) * (1 - 0.62 * light.storm)
      this.hemi.intensity = 1.21 - 0.53 * light.night + light.storm * 0.13
      this.hemi.color.set('#d6e8ff').lerp(this.nightColor, light.night)
      this.hemi.groundColor.set(light.night > 0.5 ? '#64597a' : '#a28471')
    }
    if (this.halos.length) this.halos[0].material.opacity = Math.min(0.91, light.dusk * 0.4 + light.night * 0.83)
    for (const lightSource of this.lamps)
      lightSource.intensity = this.townScene.visible ? light.night * 28 + light.dusk * 9 : 0
    for (const [m, base] of this.glow) m.emissiveIntensity = base * (0.32 + 2.45 * light.night + 1.15 * light.dusk)
    if (this.townScene.visible) {
      for (const person of this.people) person.update(reduced ? 0 : dt, cam.position)
      // Reuse town shadows between updates; view and helm are sampled every frame.
      if (now - this.lastShadow >= 0.12 || this.lastShadow < 0) {
        this.renderer.shadowMap.needsUpdate = true
        this.lastShadow = now
      }
    }
    this.renderer.render(this.scene, cam)
  }
  private releaseRenderer() {
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
  dispose() {
    this.generation++
    this.dead = true
    this.reset()
    this.sun?.shadow.map?.dispose()
    this.sun?.shadow.mapPass?.dispose()
    this.wayfarer.dispose()
    if (!this.compiling) this.releaseRenderer()
  }
}
