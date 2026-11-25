import { SKY, type Vessel } from './battle-model'
import type { CrewPair } from './contact-combat'

type Side = keyof CrewPair

function shipMarker(layer: HTMLElement, side: Side, name: string) {
  const tag = document.createElement('div')
  tag.className = 'ship-marker'
  tag.dataset.ship = side
  tag.innerHTML = '<strong></strong><span class="ship-meter">Hull <i><b></b></i></span><span class="ship-meter crew-meter">Crew <i><b></b></i></span>'
  tag.querySelector('strong')!.textContent = name
  layer.append(tag)
  const [hull, crew] = tag.querySelectorAll<HTMLElement>('b')
  return { tag, hull, crew }
}

// Native text and bars stay legible at a fixed CSS size while the battle camera zooms.
export class BattleMarkers {
  private readonly player
  private readonly enemy
  private width = 0
  private height = 0
  private tagWidth = 0
  private playerAbove = true

  constructor(private layer: HTMLElement, playerName: string, enemyName: string) {
    layer.style.visibility = 'hidden'
    this.player = shipMarker(layer, 'player', playerName)
    this.enemy = shipMarker(layer, 'enemy', enemyName)
    this.resize()
  }

  resize() {
    this.width = this.layer.clientWidth
    this.height = this.layer.clientHeight
    this.tagWidth = Math.min(144, Math.max(90, Math.round(this.width / 10)))
    this.layer.style.setProperty('--marker-width', this.tagWidth + 'px')
  }

  update(player: Vessel, enemy: Vessel, crew: CrewPair, maximum: CrewPair, touching: boolean, scrollX: number, scrollY: number) {
    this.layer.style.visibility = 'visible'
    const scale = this.width / SKY.width
    const tagHeight = touching ? 47 : 32
    const y = (ship: Vessel) => (ship.y - scrollY) * scale
    // Include the painted bow at oblique bearings. The upper and lower labels go
    // outside the pair where the two instruments would otherwise cover each other.
    const reach = (ship: Vessel) => (Math.abs(Math.sin(ship.heading)) * 57 + Math.abs(Math.cos(ship.heading)) * 22) * scale
    const near = Math.abs(player.x - enemy.x) * scale < this.tagWidth + 6 &&
      Math.abs(player.y - enemy.y) * scale < reach(player) + reach(enemy) + tagHeight + 8
    const upper = Math.min(y(player) - reach(player), y(enemy) - reach(enemy))
    const lower = Math.max(y(player) + reach(player), y(enemy) + reach(enemy))
    if (Math.abs(y(player) - y(enemy)) > 6) this.playerAbove = player.y < enemy.y
    this.layer.classList.toggle('boarding', touching)
    for (const [side, ship] of [['player', player], ['enemy', enemy]] as const) {
      const marker = this[side]
      marker.tag.hidden = ship.hull <= 0
      const x = Math.max(2, Math.min(this.width - this.tagWidth - 2, (ship.x - scrollX) * scale - this.tagWidth / 2))
      let top = y(ship) - reach(ship) - tagHeight - 3
      if (near) {
        top = (side === 'player') === this.playerAbove ? upper - tagHeight - 3 : lower + 4
      }
      const clamped = Math.max(2, Math.min(this.height - tagHeight - 2, top))
      // Whole CSS pixels keep small glyphs stable while the hull turns underneath.
      marker.tag.style.transform = `translate(${Math.round(x)}px,${Math.round(clamped)}px)`
      marker.hull.style.transform = `scaleX(${Math.max(0, ship.hull / ship.maxHull)})`
      if (touching) marker.crew.style.transform = `scaleX(${Math.max(0, crew[side] / maximum[side])})`
    }
  }
}
