import type Phaser from 'phaser'

export function hullDamageStage(hull: number, maxHull: number): number {
  const fraction = hull / maxHull
  return fraction < 0.15 ? 3 : fraction < 0.35 ? 2 : fraction < 0.7 ? 1 : 0
}

type Point = [number, number]

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath()
  ctx.moveTo(...points[0])
  for (const point of points.slice(1)) ctx.lineTo(...point)
  ctx.closePath()
}

// Damage is painted into copies of the original transparent illustration. Both renderers
// get the same torn silhouette and the shadow uses the same missing pieces as the hull.
export function damagedHull(scene: Phaser.Scene, key: string, stage: number): string {
  if (!stage) return key
  const name = `${key}-damage-${stage}`
  if (scene.textures.exists(name)) return name
  const original = scene.textures.get(key).getSourceImage() as HTMLImageElement
  const texture = scene.textures.createCanvas(name, original.width, original.height)
  if (!texture) return key
  const ctx = texture.context
  ctx.drawImage(original, 0, 0)
  ctx.save()
  ctx.scale(original.width / 240, original.height / 80)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = ['transparent', 'rgba(88,51,31,.09)', 'rgba(41,36,35,.22)', 'rgba(25,31,34,.43)'][stage]
  ctx.fillRect(0, 0, 240, 80)

  function tear(points: Point[]) {
    polygon(ctx, points)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.strokeStyle = '#352b27'
    ctx.lineWidth = 3.6
    ctx.stroke()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-atop'
  }
  function scar(x: number, y: number, w: number) {
    const soot = ctx.createRadialGradient(x, y, 1, x, y, w)
    soot.addColorStop(0, '#291e1c')
    soot.addColorStop(0.4, 'rgba(66,42,29,.9)')
    soot.addColorStop(1, 'rgba(50,33,25,0)')
    ctx.fillStyle = soot
    ctx.fillRect(x - w, y - w, 2 * w, 2 * w)
    ctx.strokeStyle = '#dca462'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x - w * 0.7, y + 2)
    ctx.lineTo(x - 3, y + 3)
    ctx.lineTo(x + 1, y - 2)
    ctx.lineTo(x + w * 0.7, y - 1)
    ctx.stroke()
  }
  // The raider's red mainsail sits farther aft than the Wayfarer's solar mainsail.
  const main = key === 'opponent' && original.height / original.width > 0.37 ? 105 : 137
  tear([
    [main - 19, -3],
    [main + 2, -3],
    [main + 5, 11],
    [main, 8],
    [main - 1, 17],
    [main - 7, 10],
    [main - 6, 16],
    [main - 14, 8],
  ])
  scar(79, 43, 10)
  if (stage >= 2) {
    tear([
      [42, 3],
      [65, 2],
      [68, 13],
      [62, 10],
      [60, 21],
      [56, 17],
      [53, 26],
      [48, 18],
    ])
    tear([
      [main - 16, 82],
      [main + 10, 82],
      [main + 5, 68],
      [main, 71],
      [main - 3, 62],
      [main - 9, 66],
    ])
    scar(159, 42, 13)
    tear([
      [68, 59],
      [70, 51],
      [74, 54],
      [80, 50],
      [79, 61],
    ])
  }
  if (stage >= 3) {
    tear([
      [main + 2, -2],
      [main + 22, 1],
      [main + 23, 25],
      [main + 16, 20],
      [main + 14, 28],
      [main + 9, 23],
    ])
    tear([
      [176, 10],
      [195, 16],
      [197, 30],
      [190, 25],
      [185, 31],
      [182, 24],
    ])
    tear([
      [144, 65],
      [146, 51],
      [151, 54],
      [155, 49],
      [163, 60],
    ])
    scar(35, 38, 13)
    scar(main, 39, 14)
  }
  ctx.restore()
  texture.refresh()
  return name
}
