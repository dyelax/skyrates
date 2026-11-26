import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildShip,
  advanceBroadside,
  fireBroadside,
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

test('a captain can fire one, two or all three loaded guns without disturbing either rail’s pending work', () => {
  const ship = buildShip(position, 0, 5, 0)
  const port = ship.guns.filter(gun => gun.side === 'port')
  const starboard = ship.guns.filter(gun => gun.side === 'starboard')
  const interval = port[0].reload / port.length
  assert.equal(port.length, 3)
  assert.ok(gunBearsOn(ship, port[0], broadside))
  assert.equal(gunBearsOn(ship, starboard[0], broadside), false)
  const full = fireBroadside(ship, 'port', 5)
  assert.equal(full.length, 1)
  full.push(...advanceBroadside(ship, .14, 5))
  assert.equal(full.length, 3)
  assert.equal(new Set(full.map(shot => shot.x)).size, 3)
  assert.ok(full.every(shot => shot.damage === 30))
  assert.deepEqual(port.map(gun => gun.cooldown), [interval, 2 * interval, 3 * interval])
  assert.deepEqual(fireBroadside(ship, 'port', 5), [])
  moveShip(ship, 0, 1.25 * interval)
  const pending = port.slice(1).map(gun => gun.cooldown)
  const single = fireBroadside(ship, 'port', 5)
  assert.equal(single.length, 1)
  assert.equal(single[0].damage, full[0].damage)
  assert.deepEqual(port.slice(1).map(gun => gun.cooldown), pending)
  assert.ok(Math.abs(port[0].cooldown - (pending[1] + interval)) < 1e-9)
  moveShip(ship, 0, 1.75 * interval)
  assert.equal(fireBroadside(ship, 'port', 5).length + advanceBroadside(ship, .07, 5).length, 2)
  const before = port.map(gun => gun.cooldown)
  assert.equal(fireBroadside(ship, 'starboard', 5).length + advanceBroadside(ship, .14, 5).length, 3)
  assert.deepEqual(port.map(gun => gun.cooldown), before)
})

test('frame rate and repeated empty orders give the same rounds per rail over complete loading cycles', () => {
  for (const hz of [30, 60, 120]) {
    for (const waitForFull of [false, true]) {
      const ship = buildShip(position, 0, 5, 0)
      const rail = ship.guns.filter(gun => gun.side === 'port')
      let rounds = fireBroadside(ship, 'port', 5).length
      // 29 seconds is ten complete 2.9s cycles. In both modes an
      // already-loaded round may always be fired on the boundary itself.
      for (let i = 0; i < 29 * hz; i++) {
        moveShip(ship, 0, 1 / hz)
        rounds += advanceBroadside(ship, 1 / hz, 5).length
        if (!waitForFull || rail.every(gun => !gun.cooldown))
          rounds += fireBroadside(ship, 'port', 5).length
        if (!waitForFull) assert.equal(fireBroadside(ship, 'port', 5).length, 0)
      }
      rounds += advanceBroadside(ship, .14, 5).length
      assert.equal(rounds, 33)
      assert.ok(ship.guns.filter(gun => gun.side === 'starboard').every(gun => !gun.cooldown))
    }
  }
})

test('gunnery and hull upgrades improve actual shots and armor; prior damage persists', () => {
  const basic = buildShip(position, 0, 0, 0)
  const upgrade = buildShip(position, 0, 1, 1, 64)
  assert.equal(upgrade.maxHull, 125)
  assert.equal(upgrade.hull, 64)
  assert.ok(upgrade.guns[0].reload < basic.guns[0].reload)
  const gunner = buildShip(position, 0, 1, 1, 64, true)
  assert.equal(gunner.guns[0].reload, upgrade.guns[0].reload * 0.8)
  const a = fireBroadside(basic, 'port', 0)[0]
  const b = fireBroadside(upgrade, 'port', 1)[0]
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
  for (const [level, sides] of ['p', 'ps', 'psp', 'psps', 'pspsp', 'pspsps'].entries()) {
    const ship = buildShip(position, 0, level, 0)
    assert.equal(ship.guns.map((gun) => gun.side[0]).join(''), sides)
  }
})

test('all six fitted stations launch perpendicular to a moving hull at every heading', () => {
  for (const heading of [0, -0.78, 1.5, Math.PI]) {
    const ship = buildShip(position, heading, 5, 0)
    ship.vx = 83
    ship.vy = -21
    const shots = [...fireBroadside(ship, 'port', 0), ...fireBroadside(ship, 'starboard', 0), ...advanceBroadside(ship, .14, 0)]
    for (const gun of ship.guns) {
      const muzzle = gunMuzzle(ship, gun)
      const shot = shots.find(round => round.x === muzzle.x && round.y === muzzle.y)!
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
    const shot = fireBroadside(gunship, gun.side, 0)[0]
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
  const shot = fireBroadside(ship, 'port', 0)[0]
  const launch = { ...shot }
  assert.ok(Math.abs(launch.vy) < 1e-10)
  moveShot(shot, 1, wind)
  assert.ok(shot.y > launch.y && shot.vy > launch.vy)
  ship.throttle = 0
  for (let i = 0; i < 240; i++) moveShip(ship, 0, 1 / 60, wind)
  assert.ok(ship.y > 265)
})

test('capital orders reserve 24 real barrels, roll unevenly and emit from the current muzzle exactly once', () => {
  for (const hz of [30, 60, 120]) {
    const ship = buildShip(position, 0, 10, 4)
    const first = fireBroadside(ship, 'port', 10)
    const rail = ship.guns.filter(gun => gun.side === 'port')
    assert.equal(rail.length, 24)
    assert.equal(new Set(rail.map(gun => gunMuzzle(ship, gun).x)).size, 24)
    assert.equal(first.length + rail.filter(gun => gun.salvoIn !== undefined).length, 24)
    assert.equal(fireBroadside(ship, 'port', 10).length, 0)
    const openingPorts = rail.filter(gun => (gun.salvoIn ?? 0) < .05).map(gun => gunMuzzle(ship, gun).x - ship.x)
    assert.ok(openingPorts.some(x => x > 25) && openingPorts.some(x => x < -25) && openingPorts.some(x => Math.abs(x) < 15))
    let rounds = first.length, last = 0
    const timings = [0]
    for (let tick = 1; tick <= hz; tick++) {
      ship.x += .2
      ship.heading += .004
      const due = rail.filter(gun => gun.salvoIn !== undefined && gun.salvoIn <= 1 / hz + 1e-9)
      const released = advanceBroadside(ship, 1 / hz, 10)
      assert.equal(released.length, due.length)
      for (const [i, round] of released.entries()) {
        assert.deepEqual({x: round.x, y: round.y}, gunMuzzle(ship, due[i]))
        assert.ok(Math.abs(round.vx * Math.cos(ship.heading) + round.vy * Math.sin(ship.heading)) < 1e-9)
        assert.equal(round.damage, 30)
      }
      if (released.length) {
        rounds += released.length
        last = tick / hz
        timings.push(last)
      }
    }
    assert.equal(rounds, 24)
    assert.ok(last >= .85 && last <= .90)
    const intervals = timings.slice(1).map((time, i) => time - timings[i])
    assert.ok(intervals.some(s => s < .04) && intervals.filter(s => s >= .05).length >= 5)
    assert.equal(advanceBroadside(ship, 10, 10).length, 0)
  }
})

test('early capital orders touch only newly loaded guns while the original salvo is still firing', () => {
  const ship = buildShip(position, 0, 10, 4)
  let released = fireBroadside(ship, 'port', 10).length
  for (let i=0; i<12; i++) {
    moveShip(ship, 0, 1/60)
    released += advanceBroadside(ship, 1/60, 10).length
  }
  const pending = ship.guns.filter(gun => gun.salvoIn !== undefined)
  const before = pending.map(gun => [gun.cooldown, gun.salvoIn])
  const early = fireBroadside(ship, 'port', 10)
  assert.ok(early.length > 0)
  assert.deepEqual(pending.map(gun => [gun.cooldown, gun.salvoIn]), before)
  assert.equal(fireBroadside(ship, 'port', 10).length, 0)
  released += early.length + advanceBroadside(ship, 1, 10).length
  assert.equal(released, 26)
  assert.ok(ship.guns.filter(gun => gun.side === 'starboard').every(gun => !gun.cooldown))
})
