import assert from 'node:assert/strict'
import test from 'node:test'
import { armedSide, boardingOdds, buildOpponent, buildShip, inArc, WATCH_CUTTER } from '../src/battle-model'
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

test('lookout and battle resolve the same boarding chance for each crew and reward disabling a hull', () => {
  const captain = buildShip(origin, 0, 0, 0, 80)
  let previousChance = 1
  for (const profile of RAIDER_PROFILES) {
    const foe = buildOpponent(toPort, 0, profile)
    const lookout = boardingOdds(6, 1.25, captain, { hull: profile.hull, maxHull: profile.hull }, profile.crew)
    const atContact = boardingOdds(6, 1.25, captain, foe, profile.crew)
    assert.equal(lookout, atContact)
    assert.ok(atContact < previousChance)
    foe.hull /= 2
    assert.ok(boardingOdds(6, 1.25, captain, foe, profile.crew) > atContact)
    previousChance = atContact
  }
  const watch = buildOpponent(toPort, 0, WATCH_CUTTER)
  assert.equal(watch.maxHull, 82)
  assert.equal(watch.guns.length, 4)
  assert.equal(WATCH_CUTTER.crew, 8.3)
})
