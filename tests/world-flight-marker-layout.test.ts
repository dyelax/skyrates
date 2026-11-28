import test from 'node:test'
import assert from 'node:assert/strict'
import { bearingPosition, combatLabelPosition } from '../src/world-flight-marker-layout'

test('edge bearings keep the full range chip and wrap continuously around four corners', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1280, 760],
  ]) {
    for (const chip of [90, 146, 185]) {
      let prev
      for (let i = 0; i <= 3600; i++) {
        const angle = (i * Math.PI) / 1800
        const p = bearingPosition(
          { x: width / 2 + 20000 * Math.cos(angle), y: height / 2 + 20000 * Math.sin(angle) },
          width,
          height,
          true,
          chip,
        )
        assert.ok(p.edge)
        assert.ok(p.x - chip / 2 >= 11.99 && p.x + chip / 2 <= width - 11.99)
        assert.ok(p.y >= 91.99 && p.y <= height - 91.99)
        if (prev) assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) < 5)
        prev = p
      }
    }
  }
})

test('combat meters separate as two live anchors overlap without snapping at 100px', () => {
  let last
  for (let x = 170; x >= 0; x--) {
    const p = { x: 0, y: 0 },
      q = { x, y: 0 }
    const own = combatLabelPosition(p, q, false),
      enemy = combatLabelPosition(p, q, true)
    if (last) assert.ok(Math.hypot(own.x - last.x, own.y - last.y) < 1.25)
    if (!x) assert.ok(enemy.y < own.y - 60)
    last = own
  }
})
