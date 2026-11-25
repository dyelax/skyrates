import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { hullDamageStage } from '../src/battle-damage'
import { mountBattleFx } from '../src/battle-fx'

test('visible damage follows remaining hull across starter, upgraded and enemy hulls', () => {
  for (const max of [62, 100, 150]) {
    const stages = [1, 0.7, 0.69, 0.35, 0.34, 0.15, 0.14, 0].map((f) => hullDamageStage(f * max, max))
    assert.deepEqual(stages, [0, 0, 1, 1, 2, 2, 3, 3])
  }
})

test('repeated impacts stay bounded, and a reduced-motion wreck can settle only once', (t) => {
  const media = { matches: false }
  const button = { focus() {}, remove() {}, onclick() {} }
  const restoreWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const restoreDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => media } })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => button },
  })
  t.after(() => {
    if (restoreWindow) Object.defineProperty(globalThis, 'window', restoreWindow)
    else Reflect.deleteProperty(globalThis, 'window')
    if (restoreDocument) Object.defineProperty(globalThis, 'document', restoreDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  })

  const events = new EventEmitter()
  const camera: number[] = []
  const paint = new Proxy({}, { get: () => () => paint })
  const image = {
    texture: { key: 'hull' },
    visible: true,
    width: 720,
    height: 240,
    scaleX: 1,
    scaleY: 1,
    setTexture() {
      return this
    },
    setVisible(show: boolean) {
      this.visible = show
      return this
    },
    setDepth() {
      return this
    },
    setCrop() {
      return this
    },
    setScale() {
      return this
    },
    setRotation() {
      return this
    },
    setPosition() {
      return this
    },
    setTint() {
      return this
    },
    setAlpha() {
      return this
    },
    destroy() {},
  }
  const scene = {
    events,
    add: { graphics: () => paint, image: () => ({ ...image }) },
    textures: { exists: () => true },
    scale: { width: 960 },
    game: { canvas: { getBoundingClientRect: () => ({ width: 390 }) } },
    cameras: { main: { setScroll: (x: number, y: number) => camera.push((Math.hypot(x, y) * 390) / 960) } },
  }
  const player = { hull: { ...image }, shadow: { ...image } }
  const enemy = { hull: { ...image }, shadow: { ...image } }
  const pose = { x: 100, y: 140, heading: 0, hull: 100, maxHull: 100 }
  mountBattleFx(scene as never, { append() {} } as never, { player, enemy } as never, {
    player: pose,
    enemy: pose,
  })
  const tick = () => events.emit('postupdate', 0, 1000 / 120)
  const fire = (damage: number) => events.emit('sky:hit', { x: 36, y: 84, nx: 1, ny: 0, damage })
  for (let i = 0; i < 240; i++) {
    fire(1000)
    tick()
  }
  assert.ok(Math.max(...camera) > 3 && Math.max(...camera) <= 4.4, 'worst barrage limited in screen pixels')
  assert.ok(
    camera.filter((m) => m === 0).length >= 4,
    'repeated fire must release the camera between impulses',
  )
  media.matches = true
  tick()
  const before = camera.length
  for (let i = 0; i < 10; i++) {
    fire(90)
    tick()
  }
  assert.deepEqual(camera.slice(before), [], 'reduced motion keeps the camera still')
  let results = 0
  events.emit('sky:terminal', { sunk: ['enemy'], complete: () => results++ })
  assert.equal(enemy.hull.visible, false)
  assert.equal(player.hull.visible, true)
  for (let i = 0; i < 36; i++) tick()
  assert.equal(results, 0, 'static wreck remains on screen')
  button.onclick()
  for (let i = 0; i < 80; i++) tick()
  button.onclick()
  assert.equal(results, 1)
})
