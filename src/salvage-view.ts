import type Phaser from 'phaser'
import { GOODS } from './data'
import type { Point } from './battle-model'
import {
  fallingPoint,
  recovered,
  SALVAGE_SECONDS,
  type SalvageArea,
  type SalvageLoad,
  type SalvageState,
} from './salvage'
import './salvage.css'

export class SalvageView {
  private ink: Phaser.GameObjects.Graphics
  private readonly panel = document.createElement('section')
  private readonly time: HTMLElement
  private readonly count: HTMLElement
  private readonly message: HTMLElement
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)')
  private lastCount = -1
  constructor(
    scene: Phaser.Scene,
    root: HTMLElement,
    private load: SalvageLoad,
    steer: () => void,
    leave: () => void,
  ) {
    this.ink = scene.add.graphics().setDepth(6.7)
    this.panel.className = 'salvage-watch'
    this.panel.dataset.markerObstacle = ''
    this.panel.setAttribute('aria-label', 'Falling cargo')
    this.panel.innerHTML =
      '<div><strong>Falling cargo</strong><b data-time></b></div><p data-count></p><p data-message role="status">Fly through a crate to recover it.</p><nav><button type="button" data-steer>Steer to crate</button><button type="button" data-leave>Leave salvage</button></nav>'
    root.append(this.panel)
    this.time = this.panel.querySelector('[data-time]')!
    this.count = this.panel.querySelector('[data-count]')!
    this.message = this.panel.querySelector('[data-message]')!
    const pilot = this.panel.querySelector<HTMLButtonElement>('[data-steer]')!
    pilot.onclick = steer
    this.panel.querySelector<HTMLButtonElement>('[data-leave]')!.onclick = leave
    pilot.focus({ preventScroll: true })
  }
  draw(state: SalvageState, wind: Point, area: SalvageArea, pixel: number) {
    this.summary(GOODS[this.load.manifest.good].name, recovered(state), state.crates.length, state.remaining)
    drawFallingCrates(this.ink, state, wind, area, pixel, this.reduced.matches)
  }
  summary(label: string, n: number, total: number, remaining: number) {
    const time = Math.ceil(remaining) + 's'
    if (this.time.textContent !== time) this.time.textContent = time
    if (n !== this.lastCount) {
      this.count.textContent = label + ' · ' + n + '/' + total + ' aboard'
      if (n > 0) this.message.textContent = 'Recovered ' + n + ' ' + (n === 1 ? 'crate.' : 'crates.')
      this.lastCount = n
    }
  }
  close() {
    this.ink.destroy()
    this.panel.remove()
  }
}

export function drawFallingCrates(
  g: Phaser.GameObjects.Graphics,
  state: SalvageState,
  wind: Point,
  area: SalvageArea,
  pixel: number,
  reduced: boolean,
) {
  g.clear()
  if (!state.remaining) return
  const t = (SALVAGE_SECONDS - state.remaining) / SALVAGE_SECONDS
  g.setAlpha(reduced ? 1 : 1 - Math.max(0, t - 0.72) * 2.2)
  for (const crate of state.crates) {
    if (crate.taken) continue
    const { x, y } = fallingPoint(crate, state.remaining, wind, area)
    const drift = reduced ? 0 : Math.sin(t * 16 + crate.x) * 1.15 * pixel
    const size = (reduced ? 8.8 : 10 - 2.7 * t) * pixel,
      cy = y + drift
    g.fillStyle(0x243942, 0.25).fillEllipse(x + 2 * pixel, cy + size * 0.86, size * 2.2, size * 0.7)
    g.lineStyle(1.3 * pixel, 0xffe19b, 0.86).strokeCircle(x, cy, size + 5 * pixel)
    g.fillStyle(0xa96e3c).fillRoundedRect(x - size, cy - size * 0.72, size * 2, size * 1.44, 2 * pixel)
    g.lineStyle(1.4 * pixel, 0x402c27).strokeRect(x - size, cy - size * 0.72, size * 2, size * 1.44)
    g.lineStyle(2 * pixel, 0xf4d49a)
      .lineBetween(x - size * 0.57, cy - size * 0.7, x - size * 0.57, cy + size * 0.7)
      .lineBetween(x + size * 0.57, cy - size * 0.7, x + size * 0.57, cy + size * 0.7)
    g.lineStyle(1.2 * pixel, 0x63482e).lineBetween(
      x - size * 0.42,
      cy + size * 0.58,
      x + size * 0.42,
      cy - size * 0.58,
    )
    if (!reduced)
      g.lineStyle(pixel, 0xf6e0af, 0.5).lineBetween(
        x - size * 0.7,
        cy - size * 1.35,
        x - size * 0.7,
        cy - size * 1.9,
      )
  }
}
