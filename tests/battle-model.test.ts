import assert from 'node:assert/strict'
import test from 'node:test'
import {
  armedSide, buildOpponent, buildShip, fireBroadside, hitsShip,
  gunBearsOn, moveShip, moveShot, steerRaider, STILL_AIR, WATCH_CUTTER, type Shot,
} from '../src/battle-model'
import { RAIDER_PROFILES } from '../src/raiders'

const origin = { x: 0, y: 0 }
const toPort = { x: 0, y: -100, heading: 0 }
const toStarboard = { x: 0, y: 100, heading: 0 }

test('raiders bring exactly the hull and firing stations reported by the lookout', () => {
  for (const profile of RAIDER_PROFILES) {
    const foe = buildOpponent(origin, 0, profile)
    assert.equal(foe.hull, profile.hull)
    assert.equal(foe.maxHull, profile.hull)
    assert.equal(foe.guns.length, profile.cannons)
    assert.equal(armedSide(foe, toPort), 'port')
    assert.equal(armedSide(foe, toStarboard), profile.cannons === 1 ? 'port' : 'starboard')
    assert.ok(gunBearsOn(foe, foe.guns[0], toPort))
    if (profile.cannons === 1) {
      foe.heading = Math.PI
      assert.ok(gunBearsOn(foe, foe.guns[0], toStarboard), 'a scout can turn its port gun to bear')
    } else {
      assert.ok(gunBearsOn(foe, foe.guns[1], toStarboard), 'both armed rails can bear')
    }
  }
})

test('the Watch cutter retains its practice hull and firing stations', () => {
  const watch = buildOpponent(toPort, 0, WATCH_CUTTER)
  assert.equal(watch.maxHull, 82)
  assert.equal(watch.guns.length, 4)
  assert.equal(WATCH_CUTTER.crew, 8.3)
})

test('the one-gun scout can bring its port gun to bear and hit a stationary hull on desktop and tall skies', () => {
  for (const area of [
    { width: 940, height: 460, top: 60, bottom: 370 },
    { width: 940, height: 2028, top: 100, bottom: 1700 },
  ]) {
    const height = area.bottom - area.top
    const player = buildShip({ x: 320, y: area.top + height * 0.66 }, -Math.PI * 0.48, 0, 0)
    const scout = buildOpponent({ x: 595, y: area.top + height * 0.51 }, Math.PI * 0.49, RAIDER_PROFILES[0])
    const gun = scout.guns[0]
    const dt = 1 / 60
    let shot: Shot | null = null
    let hit = false
    for (let tick = 0; tick < 8 / dt && !hit; tick++) {
      steerRaider(scout, player, area, false, dt, STILL_AIR)
      if (!shot && tick * dt >= 3.5 && gunBearsOn(scout, gun, player))
        shot = fireBroadside(scout, gun.side, 0)[0] ?? null
      if (shot && shot.lifetime > 0) {
        moveShot(shot, dt)
        hit = hitsShip(shot, player)
      }
    }
    assert.ok(hit)
  }
})

test('port and starboard make mirrored arcs, banking only as the hull starts to turn', () => {
  const turn = (direction: number, throttle: number) => {
    const ship = buildShip(origin, 0, 0, 0)
    ship.throttle = throttle
    for (let i = 0; i < 600; i++) moveShip(ship, 0, 1 / 120)
    ship.x = 0
    for (let i = 0; i < 24; i++) moveShip(ship, direction, 1 / 120)
    const entry = { ...ship }
    for (let i = 24; i < 240; i++) moveShip(ship, direction, 1 / 120)
    return { entry, end: ship }
  }
  const left = turn(-1, 3), right = turn(1, 3), slow = turn(1, 1), pivot = turn(1, 0)
  assert.ok(right.entry.heading > 0 && right.entry.heading < .07)
  assert.ok(right.entry.heel > 0 && right.entry.heel < .16)
  assert.ok(Math.abs(left.end.x - right.end.x) < 1e-7 && Math.abs(left.end.y + right.end.y) < 1e-7)
  assert.ok(Math.abs(left.end.heel + right.end.heel) < 1e-10)
  assert.ok(right.end.heel > .45 && slow.end.heel > .20)
  assert.ok(pivot.end.heading > 1 && pivot.end.heel === 0 && pivot.end.x === 0 && pivot.end.y === 0)
  assert.ok(slow.end.heading > right.end.heading && right.end.x > slow.end.x * 2)
  const slip = right.end.heading - Math.atan2(right.end.vy, right.end.vx)
  assert.ok(slip > .08 && slip < .30)
  for (let i = 0; i < 120; i++) moveShip(right.end, 0, 1 / 120)
  assert.ok(Math.abs(right.end.heel) < .05 && Math.abs(right.end.angularSpeed) < .02)
  assert.ok(Math.abs(right.end.heading - Math.atan2(right.end.vy, right.end.vx)) < .025)
})

test('the same turn, reversal and rollout agree across timestep rates and a midturn save', () => {
  const run = (hz: number, reload = false) => {
    let ship = buildShip(origin, .1, 0, 0)
    ship.throttle = 3
    for (let tick = 0; tick < 8 * hz; tick++) {
      const t = tick / hz
      if (reload && t === 4) ship = JSON.parse(JSON.stringify(ship))
      const helm = t < 3 ? 0 : t < 4.5 ? 1 : t < 6 ? -.7 : 0
      moveShip(ship, helm, 1 / hz)
    }
    return ship
  }
  const fine = run(120)
  assert.deepEqual(run(120, true), fine)
  for (const rate of [30, 60]) {
    const coarse = run(rate)
    assert.ok(Math.hypot(fine.x - coarse.x, fine.y - coarse.y) < .4)
    assert.ok(Math.abs(fine.heading - coarse.heading) < .002)
    assert.ok(Math.abs(fine.heel - coarse.heel) < .001)
  }
})
