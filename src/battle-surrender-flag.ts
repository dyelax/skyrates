import type Phaser from 'phaser'
import { SKY, type Vessel } from './battle-model'

// Keep the raised white cloth upright in the overhead view. The foot of its
// staff follows the surrendered ship's stern as the hull turns or drifts.
export class SurrenderFlag {
  private readonly flag: Phaser.GameObjects.Graphics

  constructor(private readonly scene: Phaser.Scene) {
    this.flag = scene.add.graphics().setName('struck-colors').setDepth(6.9).setVisible(false)
    const cloth = [
      { x: 0, y: -24 }, { x: 8, y: -26 }, { x: 15, y: -24 }, { x: 23, y: -25 },
      { x: 19, y: -20 }, { x: 23, y: -15 }, { x: 15, y: -14 }, { x: 8, y: -16 }, { x: 0, y: -14 },
    ]
    this.flag.lineStyle(3.5, 0x183036).lineBetween(0, 1, 0, -26)
    this.flag.lineStyle(1.4, 0xe9c68d).lineBetween(0, 1, 0, -26)
    this.flag.fillStyle(0xfff9e7).fillPoints(cloth, true)
    this.flag.lineStyle(1.5, 0x26393f).strokePoints(cloth, true)
    this.flag.lineStyle(1, 0xb2ada0).lineBetween(8, -24, 8, -18)
  }

  update(ship: Pick<Vessel, 'x' | 'y' | 'heading'>, visible: boolean): void {
    this.flag.setVisible(visible)
    if (!visible) return
    const width = this.scene.game.canvas.clientWidth
    const size = Math.max(1, Math.min(1.8, 0.72 * SKY.width / Math.max(1, width)))
    this.flag.setPosition(ship.x - 17 * Math.cos(ship.heading), ship.y - 17 * Math.sin(ship.heading)).setScale(size)
  }

  destroy(): void {
    this.flag.destroy()
  }
}
