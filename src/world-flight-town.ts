import * as T from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { artTexture, disposeMeshes, dressMaterials, paints } from './voxel/blocks'
import { ship as modeledShip } from './voxel/architecture'
import { stationArtisan } from './voxel/people'
import { WORLD_TOWNS, type WorldPose } from './world-flight'
import type { PortId } from './data'
import { GUN_POSITIONS, stationOffset } from './drill'
import type { FlightLight } from './world-flight-light'

type Point = { x: number; y: number }
const unit = 8

export class FlightTown {
  readonly renderer: T.WebGLRenderer
  private scene = new T.Scene()
  private camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 550)
  private materials = paints()
  private textures: T.Texture[] = []
  private people: ReturnType<typeof stationArtisan>[] = []
  private port?: PortId
  private pending?: PortId
  private generation = 0
  private wayfarer?: T.Group
  private mounts?: T.InstancedMesh
  private rotor?: T.Object3D
  private hemi?: T.HemisphereLight
  private sun?: T.DirectionalLight
  private lamps: T.PointLight[] = []
  private halos: T.Sprite[] = []
  private glow = new Map<T.MeshStandardMaterial, number>()
  private garden?: T.Object3D
  private lastRender = -1
  private width = 0
  private height = 0
  private duskColor = new T.Color('#ffad65')
  private noonColor = new T.Color('#fff0cf')
  private nightColor = new T.Color('#91acd9')
  constructor() {
    this.renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,
    })
    this.renderer.setClearColor(0, 0)
    this.renderer.outputColorSpace = T.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFShadowMap
  }
  private reset() {
    this.sun?.shadow.map?.dispose()
    this.sun?.shadow.mapPass?.dispose()
    this.halos[0]?.material.dispose()
    if (this.port) disposeMeshes(this.scene, this.materials, this.textures)
    this.scene.clear()
    this.textures = []
    this.people = []
    this.lamps = []
    this.halos = []
    this.materials = paints()
    this.glow.clear()
    this.rotor = undefined
    this.port = undefined
  }
  request(port: PortId) {
    if (this.pending === port) return
    this.pending = port
    const n = ++this.generation
    // Public GLBs keep their file names across art revisions.
    const url = new URL(import.meta.env.BASE_URL + 'art/flight-town-' + port + '.glb', document.baseURI)
    url.searchParams.set('v', '2')
    void new GLTFLoader()
      .loadAsync(url.href)
      .then(({ scene: model }) => {
        if (n !== this.generation) {
          disposeMeshes(model, paints(), [])
          return
        }
        this.reset()
        this.create(port, model)
        this.lastRender = -1
      })
      .catch(() => {})
  }
  ready(port: PortId) {
    return this.port === port
  }
  private create(port: PortId, model: T.Group) {
    this.port = port
    const scene = this.scene,
      town = WORLD_TOWNS[port]
    dressMaterials(this.materials, this.textures)
    const atlas = artTexture('crew-faces.webp')
    this.textures.push(atlas)
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
    scene.add(model)
    model.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material])
          if (m instanceof T.MeshStandardMaterial) {
            if (m.emissive.getHex() !== 0) this.glow.set(m, m.emissiveIntensity)
            if (m.map && !this.textures.includes(m.map)) {
              m.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
              this.textures.push(m.map)
            }
          }
      }
      if (obj.name.includes('mill-sails')) this.rotor = obj
    })
    this.garden = model.getObjectByName('winter-glass-repaired')
    this.wayfarer = modeledShip(this.materials)
    this.wayfarer.scale.setScalar(0.7)
    scene.add(this.wayfarer)
    const guns = new T.InstancedMesh(
      new T.CylinderGeometry(0.083, 0.1, 0.62, 7),
      new T.MeshStandardMaterial({ color: '#433c35', metalness: 0.46, roughness: 0.65 }),
      GUN_POSITIONS.length,
    )
    const place = new T.Object3D()
    for (const [i, g] of GUN_POSITIONS.entries()) {
      const x = (stationOffset(g.station) / 94) * 10.7,
        beam = 1.23 * Math.pow(Math.max(0.15, 1 - (x / 5.7) ** 2), 0.6),
        side = g.side === 'port' ? -1 : 1
      place.position.set(x, 1.39, side * (beam + 0.09))
      place.rotation.x = Math.PI / 2
      place.updateMatrix()
      guns.setMatrixAt(i, place.matrix)
    }
    guns.count = 0
    this.mounts = guns
    this.wayfarer.add(guns)
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
    this.textures.push(haloMap)
    const lanternMaterial = new T.SpriteMaterial({
      map: haloMap,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    })
    for (const pos of sockets) {
      const halo = new T.Sprite(lanternMaterial)
      halo.position.copy(pos)
      halo.scale.setScalar(2.45)
      scene.add(halo)
      this.halos.push(halo)
      const lamp = new T.PointLight('#ffc27a', 0, 8, 2)
      lamp.position.copy(pos)
      this.lamps.push(lamp)
      scene.add(lamp)
    }
  }
  draw(
    ctx: CanvasRenderingContext2D,
    port: PortId,
    center: Point,
    scale: number,
    elev: number,
    yaw: number,
    w: number,
    h: number,
    dt: number,
    alpha: number,
    now: number,
    player: WorldPose,
    repaired: boolean,
    light: FlightLight,
    reduced: boolean,
    cannons: number,
  ) {
    if (this.port !== port) return
    const ratio = Math.min(2, devicePixelRatio || 1, Math.sqrt(2100000 / (w * h)))
    if (this.width !== w || this.height !== h) {
      this.renderer.setPixelRatio(ratio)
      this.renderer.setSize(w, h, false)
      this.width = w
      this.height = h
      this.lastRender = -1
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
    if (this.wayfarer) {
      this.wayfarer.position.set(
        (player.x - town.center.x) / unit,
        0.12 + player.heave * 0.1,
        (player.y - town.center.y) / unit,
      )
      this.wayfarer.rotation.set(
        reduced ? 0 : player.heel,
        -player.heading,
        reduced ? 0 : -player.heave * 0.017,
        'YXZ',
      )
    }
    if (this.mounts) this.mounts.count = Math.min(cannons, GUN_POSITIONS.length)
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
    for (const lightSource of this.lamps) lightSource.intensity = light.night * 28 + light.dusk * 9
    for (const [m, base] of this.glow) m.emissiveIntensity = base * (0.32 + 2.45 * light.night + 1.15 * light.dusk)
    if (now - this.lastRender >= 1 / 30 || this.lastRender < 0) {
      for (const person of this.people) person.update(reduced ? 0 : dt, cam.position)
      this.renderer.render(this.scene, cam)
      this.lastRender = now
    }
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(this.renderer.domElement, 0, 0, w, h)
    ctx.restore()
  }
  dispose() {
    this.generation++
    this.reset()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
