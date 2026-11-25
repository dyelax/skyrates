import assert from 'node:assert/strict'
import test from 'node:test'
import { buildShip } from '../src/battle-model'
import { collisionDamage, combatEnding, contactStep, exchangeBlows, hullContact, PHYSICS_STEP } from '../src/contact-combat'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, a + ' vs ' + b)
const pair = () => [buildShip({ x: 0, y: 0 }, 0, 0, 0), buildShip({ x: 57, y: 0 }, Math.PI / 2, 0, 0)]
const crews = () => ({ player: 7.5, enemy: 8.3 })

test('square impacts mirror with either bow, head-on is equal and a scrape costs both sides a fraction', () => {
  const [a, b] = pair()
  a.vx = 94
  const contact = hullContact(a, b)
  near(contact.gap, 0); near(contact.nx, 1)
  const front = collisionDamage(a, b, contact.nx, contact.ny)
  near(front.aDamage, 5); near(front.bDamage, 15)
  const reverse = collisionDamage(b, a, -contact.nx, -contact.ny)
  near(reverse.aDamage, 15); near(reverse.bDamage, 5)
  b.heading = Math.PI
  const head = collisionDamage(a, b, 1, 0)
  near(head.aDamage, 10); near(head.bDamage, 10)
  a.vx = 0; a.vy = 94
  const scrape = collisionDamage(a, b, 1, 0)
  near(scrape.aDamage, .1); near(scrape.bDamage, .1)
  a.vy = 0
  near(collisionDamage(a, b, 1, 0).aDamage, 0)
})

test('shearing off pauses both crews; nearby recontact fights immediately, a fresh impact needs distance and time', () => {
  const [a, b] = pair(), crew = crews(), clock = { armed: true, clearSeconds: .4 }
  a.vx = 94
  assert.equal(contactStep(a, b, crew, clock, .2).touching, true)
  near(a.hull, 95); near(b.hull, 85)
  assert.ok(crew.player < 7.5 && crew.enemy < 8.3)
  const after = { ...crew }
  b.x += 5
  assert.equal(contactStep(a, b, crew, clock, 1).touching, false)
  assert.deepEqual(crew, after)
  b.x -= 5
  a.vx = 94; b.vx = 0
  assert.equal(contactStep(a, b, crew, clock, .1).damage, 0)
  assert.ok(crew.player < after.player)
  b.x += 9
  for (let i = 0; i < 47; i++) contactStep(a, b, crew, clock, PHYSICS_STEP)
  assert.equal(clock.armed, false)
  b.x -= 3; contactStep(a,b,crew,clock,PHYSICS_STEP)
  b.x += 3
  for (let i = 0; i < 48; i++) contactStep(a, b, crew, clock, PHYSICS_STEP)
  assert.equal(clock.armed, true)
  b.x -= 9; a.vx = 47; b.vx = 0
  contactStep(a, b, crew, clock, .1)
  near(a.hull, 93.75); near(b.hull, 81.25)
})

test('exchange strength integrates to the same first exhaustion at 30, 60 and 120 Hz including ties', () => {
  const baseline = { player: 10, enemy: 8.3 }
  exchangeBlows(baseline, 25)
  near(baseline.enemy, 0); near(baseline.player, 4.9590267661758265)
  for (const hz of [30,60,120]) {
    const crew = { player: 10, enemy: 8.3 }
    for (let i = 0; i < hz * 25; i++) exchangeBlows(crew, 1 / hz)
    near(crew.player, baseline.player); near(crew.enemy, 0)
  }
  const tied = { player: 5, enemy: 5 }
  exchangeBlows(tied, 25)
  assert.deepEqual(tied, { player: 0, enemy: 0 })
  const [a,b] = pair()
  assert.equal(combatEnding(a,b,tied), 'withdrawn')
  b.hull = 0
  assert.equal(combatEnding(a,b,tied), 'victory')
  a.hull = 0
  assert.equal(combatEnding(a,b,tied), 'mutualWreck')
})

test('a fast square impact wrecks a 12-hull target before boarding; half speed leaves a possible prize', () => {
  for (const speed of [47,94]) {
    const [a,b] = pair(), crew = { player: 10, enemy: 8.3 }
    b.hull = 12; a.vx = speed
    contactStep(a,b,crew,{ armed:true, clearSeconds:.4 },.1)
    if (speed === 94) {
      assert.deepEqual(crew, {player:10, enemy:8.3})
      assert.equal(combatEnding(a,b,crew), 'victory')
    } else {
      near(b.hull,8.25)
      exchangeBlows(crew, 10)
      assert.equal(combatEnding(a,b,crew), 'boarded')
    }
  }
})
