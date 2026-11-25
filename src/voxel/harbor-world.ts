import * as T from 'three'
import { artTexture, disposeMeshes, dressMaterials, paints, type Place, type V2 } from './blocks'
import { dressPort } from './surfaces'
import { buildPeople } from './people'
import { buildPort, plans } from './ports'
import { mayWalk, walkingPath } from './navigation'
import type { GameState } from '../model'

export interface HarborWorld {
  dispose(): void
  framePlace(place: Place): void
  home(): void
}
type PlaceButton = HTMLButtonElement & { dataset: DOMStringMap & { place: Place } }
const savedCameras = new Map<string, { x: number; z: number; yaw: number; pitch: number; spawn: string }>()
const v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z)
const up = v3(0, 1, 0)
const movement = new Set([
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyQ',
  'KeyE',
  'ShiftLeft',
  'ShiftRight',
])
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
  const clockKey = id + (night ? '-night' : '-day'),
    spawn = plan.start.join(',')
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
  const set = buildPort(scene, id, materials, night),
    people = buildPeople(scene, id, plan, materials)
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
  const cam = new T.PerspectiveCamera(57, 1, 0.09, 250),
    cameraPos = v3(...plan.start),
    toward = v3(...plan.look).sub(cameraPos)
  let yaw = Math.atan2(toward.x, -toward.z),
    pitch = Math.atan2(toward.y, Math.hypot(toward.x, toward.z))
  const initialYaw = yaw,
    initialPitch = pitch
  const restore = savedCameras.get(clockKey)
  if (restore?.spawn === spawn && mayWalk(restore.x, restore.z, plan.decks, set.blockades)) {
    cameraPos.x = restore.x
    cameraPos.z = restore.z
    yaw = restore.yaw
    pitch = restore.pitch
  }
  cam.position.copy(cameraPos)
  cam.rotation.set(pitch, -yaw, 0, 'YXZ')
  cam.updateMatrixWorld()
  const abort = new AbortController(),
    signal = abort.signal
  const mouse = new T.Vector2(),
    ray = new T.Raycaster(),
    ground = new T.Plane(up, 0),
    hit = v3()
  const buttons = Array.from(root.querySelectorAll<PlaceButton>('button[data-place]'))
  const sitePins = new Map(set.sites.map((s) => [s.place, s.pin]))
  sitePins.set('local', people.anchor)
  const shopBoxes = set.sites.map((s) => ({
    place: s.place,
    hitbox: new T.Box3().setFromCenterAndSize(s.center, s.size),
  }))
  const bodyBox = new T.Box3(),
    working = v3(),
    cameraForward = v3(),
    projected = v3(),
    groundPoint = v3()
  const keys = new Set<string>()
  let path: V2[] = [],
    walkTime = 0,
    displayTime = 0,
    frame = 0,
    last = 0
  let width = 1,
    height = 1,
    pressed: { id: number; x: number; y: number; lastX: number; lastY: number; moved: boolean } | null = null
  let nearest: Place | null = null,
    hovered: Place | null = null,
    framing: { yaw: number; pitch: number } | null = null,
    stopped = false
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const blocked = () =>
    root.classList.contains('reading') ||
    !!document.querySelector(
      'dialog[open], [aria-modal="true"]:not([hidden]), [data-captain-onboarding]:not([hidden])',
    )
  function home() {
    cameraPos.set(...plan.start)
    yaw = initialYaw
    pitch = initialPitch
    path = []
    framing = null
    savedCameras.delete(clockKey)
  }
  function framePlace(place: Place) {
    const p = sitePins.get(place)
    if (!p) return
    const target = p.clone().sub(cameraPos)
    framing = { yaw: Math.atan2(target.x, -target.z), pitch: Math.atan2(target.y, Math.hypot(target.x, target.z)) }
  }
  function setHover(p: Place | null) {
    if (hovered === p) return
    hovered = p
    canvas.style.cursor = p ? 'pointer' : 'grab'
    buttons.forEach((b) => b.classList.toggle('world-hover', b.dataset.place === p))
  }
  function cast(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, (-(e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(mouse, cam)
    let place: Place | null = null,
      dist = Infinity
    function candidate(p: Place, box: T.Box3) {
      if (ray.ray.intersectBox(box, hit)) {
        const d = hit.distanceTo(cam.position)
        if (d < dist) {
          dist = d
          place = p
        }
      }
    }
    shopBoxes.forEach((o) => candidate(o.place, o.hitbox))
    for (const [p, who] of [
      ['local', people.local],
      ['authority', people.keeper],
      ['market', people.vendor],
      ['shipyard', people.smith],
    ] as const) {
      working.copy(who.position)
      working.y = 0.95
      bodyBox.setFromCenterAndSize(working, v3(0.65, 1.92, 0.68))
      candidate(p, bodyBox)
    }
    return place
  }
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (blocked() || e.button !== 0) return
      pressed = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false }
      canvas.setPointerCapture(e.pointerId)
      framing = null
    },
    { signal },
  )
  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (blocked()) return
      if (pressed?.id === e.pointerId) {
        if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > 4) pressed.moved = true
        if (pressed.moved) {
          yaw -= (e.clientX - pressed.lastX) * 0.004
          pitch = T.MathUtils.clamp(pitch + (e.clientY - pressed.lastY) * 0.0036, -1.0, 0.95)
          canvas.style.cursor = 'grabbing'
          setHover(null)
        }
        pressed.lastX = e.clientX
        pressed.lastY = e.clientY
      } else setHover(cast(e))
    },
    { signal },
  )
  canvas.addEventListener(
    'pointerup',
    (e) => {
      if (pressed?.id !== e.pointerId) return
      const tap = !pressed.moved
      pressed = null
      if (!tap || blocked()) {
        setHover(null)
        return
      }
      const target = cast(e)
      if (target) {
        const btn = buttons.find((b) => b.dataset.place === target)
        btn?.focus({ preventScroll: true })
        activate(target)
      } else if (ray.ray.intersectPlane(ground, groundPoint)) {
        path = walkingPath([cameraPos.x, cameraPos.z], [groundPoint.x, groundPoint.z], plan.decks, set.blockades)
        if (path.length) viewport.dataset.walking = 'true'
      }
    },
    { signal },
  )
  canvas.addEventListener(
    'pointercancel',
    () => {
      pressed = null
      setHover(null)
    },
    { signal },
  )
  canvas.addEventListener(
    'pointerleave',
    () => {
      if (!pressed) setHover(null)
    },
    { signal },
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        blocked() ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (movement.has(e.code)) {
        e.preventDefault()
        keys.add(e.code)
        path = []
        framing = null
      }
      if (e.code === 'KeyF' && nearest && !e.repeat) {
        e.preventDefault()
        activate(nearest)
      }
      if (e.code === 'Home') {
        e.preventDefault()
        home()
      }
    },
    { signal },
  )
  document.addEventListener(
    'keyup',
    (e) => {
      keys.delete(e.code)
    },
    { signal },
  )
  window.addEventListener(
    'blur',
    () => {
      keys.clear()
      pressed = null
    },
    { signal },
  )
  root.querySelector<HTMLElement>('[data-home]')?.addEventListener('click', home, { signal })
  const ro = new ResizeObserver(() => {
    width = viewport.clientWidth
    height = viewport.clientHeight
    const cap = window.devicePixelRatio > 1.5 ? 1200 : 1350
    renderer.setPixelRatio(Math.min(1.4, devicePixelRatio, cap / Math.max(1, width)))
    renderer.setSize(width, height, false)
    cam.aspect = width / Math.max(height, 1)
    cam.updateProjectionMatrix()
  })
  ro.observe(viewport)
  root.classList.add('world-ready')
  const bg = new T.Color(night ? '#25274d' : plan.hue)
  renderer.setClearColor(bg)
  function draw(t: number) {
    if (stopped) return
    frame = requestAnimationFrame(draw)
    if (document.hidden) {
      last = t
      keys.clear()
      return
    }
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016)
    last = t
    if (!blocked()) {
      displayTime += dt
      people.update(dt)
      set.moving(displayTime)
      const turn =
        Number(keys.has('KeyE') || keys.has('ArrowRight')) - Number(keys.has('KeyQ') || keys.has('ArrowLeft'))
      yaw += turn * dt * 1.62
      const forward =
        Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
      const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
      let dx = 0,
        dz = 0
      if (forward || side) {
        dx = Math.sin(yaw) * forward + Math.cos(yaw) * side
        dz = -Math.cos(yaw) * forward + Math.sin(yaw) * side
      } else if (path.length) {
        dx = path[0][0] - cameraPos.x
        dz = path[0][1] - cameraPos.z
        if (Math.hypot(dx, dz) < 0.15) path.shift()
      }
      const length = Math.hypot(dx, dz)
      if (length > 0.01) {
        const scale = (dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.0 : 3.1)) / length
        if (mayWalk(cameraPos.x + dx * scale, cameraPos.z, plan.decks, set.blockades)) cameraPos.x += dx * scale
        if (mayWalk(cameraPos.x, cameraPos.z + dz * scale, plan.decks, set.blockades)) cameraPos.z += dz * scale
        walkTime += dt * 8.1
      }
      if (framing) {
        const d = Math.atan2(Math.sin(framing.yaw - yaw), Math.cos(framing.yaw - yaw)),
          f = reduced.matches ? 1 : 1 - Math.exp(-dt * 11)
        yaw += d * f
        pitch += (framing.pitch - pitch) * f
        if (Math.abs(d) < 0.001) framing = null
      }
      cam.position.copy(cameraPos)
      if (length > 0.01 && !reduced.matches) cam.position.y += Math.sin(walkTime) * 0.025
      cam.rotation.order = 'YXZ'
      cam.rotation.set(pitch, -yaw, 0, 'YXZ')
      cam.updateMatrixWorld()
      cam.getWorldDirection(cameraForward)
      let score = Infinity
      nearest = null
      for (const btn of buttons) {
        const p = sitePins.get(btn.dataset.place)
        if (!p) continue
        projected.copy(p).project(cam)
        const x = (projected.x * 0.5 + 0.5) * width,
          y = (-projected.y * 0.5 + 0.5) * height
        const visible = projected.z < 1 && projected.z > 0 && x > 13 && x < width - 13 && y > 14 && y < height - 20
        btn.classList.toggle('pin-outside', !visible)
        btn.style.left = x + 'px'
        btn.style.top = y + 'px'
        const distance = p.distanceTo(cameraPos),
          proximity = working.copy(p).sub(cameraPos).normalize().dot(cameraForward)
        if (visible && distance < 4.4 && proximity > 0.71 && distance < score) {
          score = distance
          nearest = btn.dataset.place
        }
      }
      viewport.dataset.walking = path.length ? 'true' : 'false'
    } else {
      keys.clear()
      path = []
    }
    if (!probeReady && sky.image?.width) {
      // The reflection sees the actual lanterns, hulls and painted sky from the quay.
      probeReady = true
      probeCamera.update(renderer, scene)
      scene.environment = probe.texture
    }
    renderer.render(scene, cam)
  }
  frame = requestAnimationFrame(draw)
  return {
    home,
    framePlace,
    dispose() {
      stopped = true
      cancelAnimationFrame(frame)
      savedCameras.set(clockKey, { x: cameraPos.x, z: cameraPos.z, yaw, pitch, spawn })
      abort.abort()
      ro.disconnect()
      probe.dispose()
      disposeMeshes(scene, materials, textures)
      renderer.dispose()
      renderer.forceContextLoss()
      root.classList.remove('world-ready')
    },
  }
}
