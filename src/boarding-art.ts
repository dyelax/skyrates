import type Phaser from 'phaser'

type Rail = { x: number; y: number; nx: number; ny: number }

// Two impressions of the boarding parties, drawn where the rails actually meet.
// They illustrate the continuous crew exchange; the combat model owns its timing.
export function drawBoarders(ink: Phaser.GameObjects.Graphics, rail: Rail, scale: number, seconds: number, still: boolean) {
  ink.clear().save().translateCanvas(rail.x, rail.y)
    .rotateCanvas(Math.atan2(rail.ny, rail.nx)).scaleCanvas(scale, scale)
  const beat = still ? .5 : Math.sin(seconds * Math.PI * 1.9)
  for (const side of [-1, 1]) {
    const reach = still ? .55 : (1 + side * beat) / 2
    const x = side * (5.6 - reach * 1.6)
    ink.save().translateCanvas(x, side * 1.25).scaleCanvas(-side, 1)
    const fistX = 1.7 + 1.9 * reach, fistY = -1.35
    const bladeX = fistX + 1.6 + reach * 2.5, bladeY = -5.8 + reach * 5
    // Alternating arm and cutlass strokes keep the action on the rail. The
    // dark edge reads against white canvas and the light edge against timber.
    ink.lineStyle(2.1, 0x233337).lineBetween(fistX, fistY, bladeX, bladeY)
    ink.lineStyle(1.0, 0xffebbc).lineBetween(fistX, fistY - .25, bladeX, bladeY - .25)
    ink.fillStyle(0x223036).fillEllipse(-.5, .7, 5.7, 6)
    ink.fillStyle(side < 0 ? 0x8dc3b6 : 0xbc6552).fillEllipse(-.85, .9, 4.4, 4.9)
    ink.lineStyle(2.3, side < 0 ? 0xb3d6c5 : 0xd18c66).lineBetween(.3, -.3, fistX, fistY)
    ink.fillStyle(0xeccea0).fillCircle(.6, -1, 1.65)
    ink.fillStyle(side < 0 ? 0x314a4d : 0x79463a).fillEllipse(.3, -1.75, 3.5, 1.6)
    ink.restore()
  }
  ink.restore()
}
