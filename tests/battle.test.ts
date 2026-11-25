import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boardingContact,
  boardingOdds,
  buildShip,
  discharge,
  hitsShip,
  inArc,
  moveShip,
  moveShot,
} from '../src/battle-model'

const position = { x: 250, y: 220 }
const broadside = { x: 250, y: 50 }

test('schooner cannons track independent reload times and a broadside shoots only loaded guns', () => {
  const ship = buildShip(position, 0, 3, 0)
  const port = ship.guns.filter((gun) => gun.side === 'port')
  assert.equal(port.length, 2)
  assert.ok(inArc(ship, 'port', broadside))
  assert.equal(inArc(ship, 'starboard', broadside), false)
  assert.ok(discharge(ship, port[0], broadside, 0))
  moveShip(ship, 0, 0.75)
  assert.equal(port.filter((gun) => discharge(ship, gun, broadside, 0)).length, 1)
  assert.ok(port[0].cooldown < port[1].cooldown)
  assert.ok(ship.guns.filter((gun) => gun.side === 'starboard').every((gun) => gun.cooldown === 0))
})

test('gunnery and hull upgrades improve actual shots and armor; prior damage persists', () => {
  const basic = buildShip(position, 0, 0, 0)
  const upgrade = buildShip(position, 0, 1, 1, 64)
  assert.equal(upgrade.maxHull, 125)
  assert.equal(upgrade.hull, 64)
  assert.ok(upgrade.guns[0].reload < basic.guns[0].reload)
  const gunner = buildShip(position, 0, 1, 1, 64, true)
  assert.equal(gunner.guns[0].reload, upgrade.guns[0].reload * 0.8)
  const a = discharge(basic, basic.guns[0], broadside, 0)!
  const b = discharge(upgrade, upgrade.guns[0], broadside, 1)!
  assert.ok(b.damage > a.damage)
  assert.ok(a.vy < 0)
})

test('turning and acceleration build over time and decelerating preserves momentum', () => {
  const ship = buildShip(position, 0, 0, 0)
  ship.throttle = 3
  moveShip(ship, 1, 0.1)
  assert.ok(ship.vx > 0 && ship.vx < 94)
  assert.ok(ship.angularSpeed > 0 && ship.angularSpeed < 1)
  const previous = ship.vx
  ship.throttle = 0
  moveShip(ship, 0, 0.1)
  assert.ok(ship.vx > 0 && ship.vx < previous)
})

test('ramming follows a rotated hull and hiring veterans improves boarding odds', () => {
  const a = buildShip(position, 0, 0, 0),
    b = buildShip({ x: 320, y: 220 }, Math.PI, 0, 0)
  assert.ok(boardingContact(a, b))
  assert.equal(hitsShip({ x: 250, y: 251 }, a), false)
  b.y += 45
  assert.equal(boardingContact(a, b), false)
  const green = boardingOdds(6, 1, a, b)
  const veterans = boardingOdds(6, 2.5, a, b)
  assert.ok(veterans > green + 0.3)
  b.hull = 18
  assert.ok(boardingOdds(6, 1, a, b) > green)
})

test('fresh hulls have one port gun and shipyard refits open specific independent stations', () => {
  for (const [level, sides] of ['p', 'ps', 'psp', 'psps'].entries()) {
    const ship = buildShip(position, 0, level, 0)
    assert.equal(ship.guns.map((gun) => gun.side[0]).join(''), sides)
  }
})

test('wind carries a hove-to hull and bends a live shot; the sight corrects for that wind', () => {
  const wind = { x: 0, y: 1 }
  const ship = buildShip({ x: 500, y: 220 }, -Math.PI / 2, 0, 0)
  const target = { x: 45, y: 220 }
  const fire = (set: boolean) => {
    const firingShip = structuredClone(ship)
    const shot = discharge(firingShip, firingShip.guns[0], target, 0, 0, set ? wind : undefined)!
    while (shot.x > target.x && shot.lifetime > 0) moveShot(shot, 1 / 120, wind)
    return Math.abs(shot.y - target.y)
  }
  assert.ok(fire(false) > 20)
  assert.ok(fire(true) < 4)
  ship.throttle = 0
  for (let i = 0; i < 240; i++) moveShip(ship, 0, 1 / 60, wind)
  assert.ok(ship.y > 265)
})
