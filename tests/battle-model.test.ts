import assert from 'node:assert/strict'
import test from 'node:test'
import {
  armedSide, buildOpponent, buildShip, discharge, hitsShip,
  inArc, moveShot, steerRaider, STILL_AIR, WATCH_CUTTER, type Shot,
} from '../src/battle-model'
import { RAIDER_PROFILES } from '../src/raiders'

const origin = { x: 0, y: 0 }
const toPort = { x: 0, y: -100 }
const toStarboard = { x: 0, y: 100 }

test('raiders bring exactly the hull and firing stations reported by the lookout', () => {
  for (const profile of RAIDER_PROFILES) {
    const foe = buildOpponent(origin, 0, profile)
    assert.equal(foe.hull, profile.hull)
    assert.equal(foe.maxHull, profile.hull)
    assert.equal(foe.guns.length, profile.cannons)
    assert.equal(armedSide(foe, toPort), 'port')
    assert.equal(armedSide(foe, toStarboard), profile.cannons === 1 ? 'port' : 'starboard')
    assert.ok(inArc(foe, armedSide(foe, toPort), toPort))
    if (profile.cannons === 1) {
      foe.heading = Math.PI
      assert.ok(inArc(foe, armedSide(foe, toStarboard), toStarboard), 'a scout can turn its port gun to bear')
    } else {
      assert.ok(inArc(foe, armedSide(foe, toStarboard), toStarboard), 'both armed rails can bear')
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
      if (!shot && tick * dt >= 3.5 && inArc(scout, gun.side, player))
        shot = discharge(scout, gun, player, 0)
      if (shot && shot.lifetime > 0) {
        moveShot(shot, dt)
        hit = hitsShip(shot, player)
      }
    }
    assert.ok(hit)
  }
})
