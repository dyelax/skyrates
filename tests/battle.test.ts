import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildShip,
  discharge,
  hitsShip,
  gunBearsOn,
  gunMuzzle,
  headingForBroadside,
  SHOT_SPEED,
  moveShip,
  moveShot,
} from '../src/battle-model'

const position = { x: 250, y: 220 }
const broadside = { x: 250, y: 50, heading: 0 }

test('schooner cannons track independent reload times and a broadside shoots only loaded guns', () => {
  const ship = buildShip(position, 0, 3, 0)
  const port = ship.guns.filter((gun) => gun.side === 'port')
  assert.equal(port.length, 2)
  assert.ok(gunBearsOn(ship, port[0], broadside))
  assert.equal(gunBearsOn(ship, ship.guns[1], broadside), false)
  assert.ok(discharge(ship, port[0], 0))
  moveShip(ship, 0, 0.75)
  assert.equal(port.filter((gun) => discharge(ship, gun, 0)).length, 1)
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
  const a = discharge(basic, basic.guns[0], 0)!
  const b = discharge(upgrade, upgrade.guns[0], 1)!
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

test('a projectile can miss an oriented hull at close range', () => {
  const a = buildShip(position, 0, 0, 0)
  assert.equal(hitsShip({ x: 250, y: 251 }, a), false)
})

test('fresh hulls have one port gun and shipyard refits open specific independent stations', () => {
  for (const [level, sides] of ['p', 'ps', 'psp', 'psps'].entries()) {
    const ship = buildShip(position, 0, level, 0)
    assert.equal(ship.guns.map((gun) => gun.side[0]).join(''), sides)
  }
})

test('all four fitted stations launch perpendicular to a moving hull at every heading', () => {
  for (const heading of [0, -0.78, 1.5, Math.PI]) {
    const ship = buildShip(position, heading, 3, 0)
    ship.vx = 83
    ship.vy = -21
    for (const gun of ship.guns) {
      const muzzle = gunMuzzle(ship, gun)
      const shot = discharge(ship, gun, 0)!
      assert.deepEqual({ x: shot.x, y: shot.y }, muzzle)
      const forward = shot.vx * Math.cos(heading) + shot.vy * Math.sin(heading)
      const sideways = -shot.vx * Math.sin(heading) + shot.vy * Math.cos(heading)
      assert.ok(Math.abs(forward) < 1e-10)
      assert.ok(Math.abs(sideways - (gun.side === 'port' ? -SHOT_SPEED : SHOT_SPEED)) < 1e-10)
    }
  }
})

test('firing into open sky misses an off-axis ship until the captain turns the hull', () => {
  const gunship = buildShip(position, 0, 0, 0)
  const target = buildShip({ x: position.x + 80, y: position.y - 120 }, 0, 0, 0)
  const gun = gunship.guns[0]
  const tryShot = () => {
    const shot = discharge(gunship, gun, 0)!
    while (shot.lifetime > 0) {
      moveShot(shot, 1 / 60)
      if (hitsShip(shot, target)) return true
    }
    return false
  }
  assert.equal(gunBearsOn(gunship, gun, target), false)
  assert.equal(tryShot(), false)
  gun.cooldown = 0
  gunship.heading = headingForBroadside(gunship, gun, target)
  assert.equal(gunBearsOn(gunship, gun, target), true)
  assert.equal(tryShot(), true)
})

test('wind drifts a round after launch and carries a hove-to ship', () => {
  const wind = { x: 0, y: 1 }
  const ship = buildShip({ x: 500, y: 220 }, -Math.PI / 2, 0, 0)
  const shot = discharge(ship, ship.guns[0], 0)!
  const launch = { ...shot }
  assert.ok(Math.abs(launch.vy) < 1e-10)
  moveShot(shot, 1, wind)
  assert.ok(shot.y > launch.y && shot.vy > launch.vy)
  ship.throttle = 0
  for (let i = 0; i < 240; i++) moveShip(ship, 0, 1 / 60, wind)
  assert.ok(ship.y > 265)
})
