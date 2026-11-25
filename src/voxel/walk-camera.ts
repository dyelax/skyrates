import * as T from 'three'
import type { V2, V3 } from './blocks'
import type { Deck } from './ports'
import { mayWalk, walkingPath } from './navigation'

interface WalkingSpace<Place extends string> {
  start: V3
  look: V3
  decks: Deck[]
  obstacles: Deck[]
  pins: Map<Place, T.Vector3>
  targets: { place: Place; hitbox: T.Box3 }[]
  bodies?: [Place, T.Object3D][]
  threshold?: (position: T.Vector3, dx: number, dz: number) => Place | null
  saveKey?: string
}
type PlaceButton<Place extends string> = HTMLButtonElement & { dataset: DOMStringMap & { place: Place } }
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
export function walkCamera<Place extends string>(
  root: HTMLElement,
  viewport: HTMLElement,
  renderer: T.WebGLRenderer,
  plan: WalkingSpace<Place>,
  activate: (place: Place) => void,
) {
  const canvas = renderer.domElement,
    clockKey = plan.saveKey,
    spawn = plan.start.join(',')
  const cam = new T.PerspectiveCamera(57, 1, 0.09, 250),
    cameraPos = v3(...plan.start),
    toward = v3(...plan.look).sub(cameraPos)
  let yaw = Math.atan2(toward.x, -toward.z),
    pitch = Math.atan2(toward.y, Math.hypot(toward.x, toward.z))
  const initialYaw = yaw,
    initialPitch = pitch
  const restore = clockKey ? savedCameras.get(clockKey) : undefined
  if (restore?.spawn === spawn && mayWalk(restore.x, restore.z, plan.decks, plan.obstacles)) {
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
  const buttons = Array.from(root.querySelectorAll<PlaceButton<Place>>('button[data-place]'))
  const sitePins = plan.pins,
    shopBoxes = plan.targets
  const bodyBox = new T.Box3(),
    working = v3(),
    cameraForward = v3(),
    projected = v3(),
    groundPoint = v3()
  const keys = new Set<string>()
  let path: V2[] = [],
    walkTime = 0
  let width = 1,
    height = 1,
    pressed: { id: number; x: number; y: number; lastX: number; lastY: number; moved: boolean } | null = null
  let nearest: Place | null = null,
    hovered: Place | null = null,
    framing: { yaw: number; pitch: number } | null = null
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
    if (clockKey) savedCameras.delete(clockKey)
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
    for (const [p, who] of plan.bodies ?? []) {
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
        path = walkingPath([cameraPos.x, cameraPos.z], [groundPoint.x, groundPoint.z], plan.decks, plan.obstacles)
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
  function update(dt: number) {
    if (!blocked()) {
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
        if (mayWalk(cameraPos.x + dx * scale, cameraPos.z, plan.decks, plan.obstacles)) cameraPos.x += dx * scale
        if (mayWalk(cameraPos.x, cameraPos.z + dz * scale, plan.decks, plan.obstacles)) cameraPos.z += dz * scale
        const crossing = plan.threshold?.(cameraPos, dx, dz)
        if (crossing) {
          activate(crossing)
          return
        }
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
        // Keep keyboard targets inside the scrollport while turning toward a hidden landmark.
        btn.style.left = (visible ? x : width / 2) + 'px'
        btn.style.top = (visible ? y : height / 2) + 'px'
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
  }
  return {
    camera: cam,
    home,
    framePlace,
    update,
    blocked,
    dispose() {
      if (clockKey) savedCameras.set(clockKey, { x: cameraPos.x, z: cameraPos.z, yaw, pitch, spawn })
      abort.abort()
      ro.disconnect()
    },
  }
}
