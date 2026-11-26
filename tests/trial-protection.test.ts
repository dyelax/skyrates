import test from 'node:test'
import assert from 'node:assert/strict'
import { buildShip, fireBroadside, STILL_AIR } from '../src/battle-model'
import { RAIDER_PROFILES } from '../src/raiders'
import { TrialProtection } from '../src/trial-protection'

const area = { width: 940, height: 560, top: 30, bottom: 520 }
const playerShip = () => buildShip({ x: 0, y: 0 }, 0, 5, 2)

test('both patrol ships move and fire before surrender; the prize keeps its hull and drops out of combat', () => {
  const player = playerShip()
  const patrol = new TrialProtection('prize-protection', player, RAIDER_PROFILES[0], area)
  const scout = patrol.lead, wing = patrol.extra
  const fired = new Set()
  for (let tick = 0; tick < 720; tick++) {
    patrol.stepFlight(player, area, STILL_AIR, 1 / 120, (ship, side) => {
      fired.add(ship)
      fireBroadside(ship, side, 0)
    })
  }
  assert.ok(fired.has(scout.ship) && fired.has(wing.ship))
  assert.notEqual(wing.ship.x, 655)
  scout.ship.hull = 14.5
  scout.crew = 0
  assert.ok(patrol.resolve(player, 4, false, area).changed)
  assert.equal(patrol.prize, scout)
  assert.equal(patrol.lead, wing)
  assert.equal(patrol.extra.ship.hull, 14.5)
  assert.equal(patrol.extra.role, 'struck')
  fired.clear()
  for (let tick = 0; tick < 1200; tick++) patrol.stepFlight(player, area, STILL_AIR, 1 / 120, (ship, side) => {
    fired.add(ship)
    fireBroadside(ship, side, 0)
  })
  assert.deepEqual([...fired], [wing.ship])
  wing.ship.hull = 0
  assert.equal(patrol.resolve(player, 4, false, area).ending, 'victory')
  assert.deepEqual(patrol.report, { scenario: 'prize-protection', status: 'afloat', hull: 14.5, maxHull: 62, legs: 0 })
})

test('the player can screen an exposed hull; an enemy round that reaches it costs its remaining HP', () => {
  const player = playerShip()
  const patrol = new TrialProtection('prize-protection', player, RAIDER_PROFILES[0], area)
  const prize = patrol.lead.ship
  patrol.lead.crew = 0
  patrol.resolve(player, 4, false, area)
  Object.assign(prize, { x: 400, y: 250, heading: Math.PI / 2, hull: 8 })
  Object.assign(player, { x: 460, y: 250, heading: Math.PI / 2 })
  const shooter = patrol.lead.ship
  const hit = () => {
    for (let x = 600; x > 300; x -= 2) {
      const target = patrol.shotTarget({ x, y: 250 }, { x: x + 2, y: 250 }, true, player, shooter)
      if (target) return target
    }
  }
  assert.equal(hit(), player)
  player.y += 110
  const target = hit()
  assert.equal(target, prize)
  target!.hull -= 8
  assert.match(patrol.resolve(player, 5, false, area).notice!, /gone down/)
  assert.equal(patrol.resolve(player, 5, false, area).ending, undefined)
  shooter.hull = 0
  assert.equal(patrol.resolve(player, 5, false, area).ending, 'victory')
  assert.equal(patrol.report?.status, 'lost')
})

test('escort arrival carries real damage to leg two and ties go to loss of the merchant', () => {
  const player = playerShip()
  const escort = new TrialProtection('merchant-escort', player, RAIDER_PROFILES[0], area)
  const merchant = escort.extra.ship
  assert.deepEqual(merchant.guns, [])
  player.hull = 66
  merchant.hull = 12
  Object.assign(merchant, escort.exit)
  assert.equal(escort.resolve(player, 5, false, area).changed, true)
  assert.equal(escort.completed, 1)
  assert.equal(escort.extra.ship, merchant)
  assert.equal(merchant.hull, 12)
  assert.equal(player.hull, 66)
  assert.equal(escort.lead.name, 'Corsair')
  escort.lead.ship.hull = merchant.hull = 0
  assert.equal(escort.resolve(player, 5, false, area).ending, 'defeat')
  assert.equal(escort.report?.status, 'lost')
  assert.equal(escort.report?.legs, 1)
})
