import test from 'node:test'
import assert from 'node:assert/strict'
import { placeShipMarkers } from '../src/battle-markers'

type Box = { x: number; y: number; w: number; h: number }
const crosses = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

test('boarding tags clear the HUD, batteries, hulls and each other at the chart edges', () => {
  const rooms = [
    { w: 1200, h: 503, tag: 120, panels: [{ x: 18, y: 13, w: 480, h: 82 }, { x: 18, y: 98, w: 190, h: 51 }, { x: 145, y: 392, w: 910, h: 85 }], pairs: [[449, 91], [646, 340], [8, 16], [1118, 424]] },
    { w: 320, h: 650, tag: 90, panels: [{ x: 6, y: 6, w: 308, h: 80 }, { x: 6, y: 92, w: 168, h: 53 }, { x: 4, y: 475, w: 312, h: 154 }], pairs: [[32, 96], [126, 443], [250, 116]] },
  ]
  for (const { w, h, tag, panels, pairs } of rooms) for (const [x, y] of pairs) {
    const ships: [Box, Box] = [{ x, y, w: 54, h: 36 }, { x: x + 22, y: y + 30, w: 62, h: 35 }]
    const markers = placeShipMarkers(ships, panels, { w, h }, { w: tag, h: 47 }, true)
    for (const marker of markers) {
      assert.ok(marker.x >= 0 && marker.y >= 0 && marker.x + marker.w <= w && marker.y + marker.h <= h)
      assert.ok([...panels, ...ships].every(box => !crosses(box, marker)), JSON.stringify({ ships, marker, panels }))
    }
    assert.ok(!crosses(markers[0], markers[1]))
  }
})
