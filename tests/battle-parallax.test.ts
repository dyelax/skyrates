import test from 'node:test'
import assert from 'node:assert/strict'
import { terrainPlacement } from '../src/cloud-deck'

test('a full voyage across the chart pans one continuous painting at one fifth of actual travel', () => {
  for (const [width, height] of [[940, 528], [940, 2034], [940, 338]]) {
    const place = (x: number, y: number) => terrainPlacement(width, height, 1024, 1024, x, y)
    const start = place(-width / 2, -height / 2)
    const end = place(width / 2, height / 2)
    assert.ok(Math.abs(start.x - end.x - width * .2) < 1e-10)
    assert.ok(Math.abs(start.y - end.y - height * .2) < 1e-10)
    for (const frame of [start, end, place(-2 * width, 2 * height), place(2 * width, -2 * height)]) {
      const half = 512 * frame.scale
      assert.ok(frame.x - half <= -7.999 && frame.y - half <= -7.999)
      assert.ok(frame.x + half >= width + 7.999 && frame.y + half >= height + 7.999)
    }
  }
})
