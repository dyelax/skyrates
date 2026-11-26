import test from 'node:test'
import assert from 'node:assert/strict'
import { placeShipMarkers, placeThirdMarker } from '../src/battle-markers'

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

test('an open-sky contact gives each ship a clear leader and a separate two-meter label', () => {
  for (const width of [320, 390, 1366]) {
    const player = { x: width * .42, y: 286, w: width * .09, h: width * .035 }
    const enemy = { x: player.x + 6, y: player.y + player.h - 3, w: player.w, h: player.h }
    const [you, scout] = placeShipMarkers([player,enemy], [], { w: width, h: 750 }, { w: 98, h: 47 }, true)
    assert.ok(you.y + you.h + 10 <= player.y)
    assert.ok(scout.y >= enemy.y + enemy.h + 10)
    assert.ok(!crosses(you,scout))
  }
})

test('an escort or a struck prize keeps its own label when all three hulls meet near a phone control', () => {
  const viewport = { w: 320, h: 600 }
  const tag = { w: 90, h: 47 }
  const controls = [{x: 6, y: 484, w: 142, h: 108}, {x: 160, y: 470, w: 152, h: 122}]
  const ships: [Box, Box] = [{x: 114, y: 432, w: 36, h: 24}, {x: 145, y: 435, w: 36, h: 24}]
  const third = {x: 124, y: 455, w: 36, h: 24}
  const pair = placeShipMarkers(ships, [...controls, third], viewport, tag, true)
  const obstacles = [...controls, ...ships, third, ...pair]
  for (const height of [33, 47]) {
    const marker = placeThirdMarker(third, obstacles, viewport, {w: tag.w, h: height})
    assert.ok(obstacles.every(box => !crosses(box, marker)))
    assert.ok(marker.x >= 0 && marker.x + marker.w <= viewport.w && marker.y + marker.h <= viewport.h)
  }
})
