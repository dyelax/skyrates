import { SKY, type Vessel } from './battle-model'
import type { CrewPair } from './contact-combat'

type Side = keyof CrewPair
type Box = { x: number; y: number; w: number; h: number }
const sides = ['player', 'enemy'] as const

function overlap(a: Box, b: Box) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return w * h
}

export function placeShipMarkers(ships: [Box, Box], panels: Box[], size: { w: number; h: number }, tag: { w: number; h: number }, playerAbove: boolean): [Box, Box] {
  const [player, enemy] = ships
  const near = Math.abs(player.x + player.w / 2 - enemy.x - enemy.w / 2) < tag.w + 6 &&
    player.y < enemy.y + enemy.h + tag.h + 8 && enemy.y < player.y + player.h + tag.h + 8
  const place = (x: number, y: number): Box => ({
    x: Math.round(Math.max(2, Math.min(size.w - tag.w - 2, x))),
    y: Math.round(Math.max(2, Math.min(size.h - tag.h - 2, y))),
    ...tag,
  })
  const preferred = ships.map((s, i) => {
    const above = !near || (i === 0) === playerAbove
    const edge = near
      ? above ? Math.min(player.y, enemy.y) : Math.max(player.y + player.h, enemy.y + enemy.h)
      : s.y
    return place(s.x + (s.w - tag.w) / 2, above ? edge - tag.h - 4 : edge + 4)
  }) as [Box, Box]
  const conflict = (r: Box, obstacles: Box[]) => obstacles.reduce((total, b) => total + overlap(r, b), 0)
  if (!overlap(...preferred) && preferred.every(b => !conflict(b, panels) && !conflict(b, ships))) return preferred

  // Try both ships together. Moving one label to safety can otherwise hide the
  // other. Include the panel edges when a hull is actually underneath a HUD.
  const candidates = ships.map((s, i) => {
    const x = s.x + (s.w - tag.w) / 2, y = s.y + (s.h - tag.h) / 2
    const left = s.x - tag.w - 4, right = s.x + s.w + 4
    const top = s.y - tag.h - 4, bottom = s.y + s.h + 4
    const list = [preferred[i], place(x, top), place(x, bottom), place(left, y), place(right, y),
      place(left, top), place(right, top), place(left, bottom), place(right, bottom)]
    if (near) {
      // At a chart edge both labels may need the same open side of the pair.
      list.push(place(x, Math.min(player.y, enemy.y) - 2 * (tag.h + 4)),
        place(x, Math.max(player.y + player.h, enemy.y + enemy.h) + tag.h + 8),
        place(Math.min(player.x, enemy.x) - 2 * (tag.w + 4), y),
        place(Math.max(player.x + player.w, enemy.x + enemy.w) + tag.w + 8, y))
    }
    for (const p of panels) {
      if (!overlap(p, s) && !overlap(p, preferred[i])) continue
      list.push(place(p.x - tag.w - 3, y), place(p.x + p.w + 3, y), place(x, p.y - tag.h - 3), place(x, p.y + p.h + 3))
    }
    return list.map((box, rank) => ({
      box, covered: conflict(box, panels), hull: conflict(box, ships),
      distance: Math.hypot(box.x - x, box.y - y) + 3 * rank,
    }))
  })
  let best = preferred
  let covered = Infinity, hull = Infinity, distance = Infinity
  for (const a of candidates[0]) for (const b of candidates[1]) {
    const blocked = a.covered + b.covered + overlap(a.box, b.box)
    const overHull = a.hull + b.hull, travel = a.distance + b.distance
    if (blocked > covered || (blocked === covered && (overHull > hull || (overHull === hull && travel >= distance)))) continue
    best = [a.box, b.box]
    covered = blocked
    hull = overHull
    distance = travel
  }
  return best
}

function shipMarker(layer: HTMLElement, side: Side, name: string) {
  const leader = document.createElement('i')
  leader.className = 'ship-leader'
  const tag = document.createElement('div')
  tag.className = 'ship-marker'
  tag.dataset.ship = side
  tag.innerHTML = '<strong></strong><span class="ship-meter">Hull <i><b></b></i></span><span class="ship-meter crew-meter">Crew <i><b></b></i></span>'
  tag.querySelector('strong')!.textContent = name
  layer.append(leader, tag)
  const [hull, crew] = tag.querySelectorAll<HTMLElement>('b')
  return { tag, leader, hull, crew }
}

// Native text and bars stay legible at a fixed CSS size while the battle camera zooms.
export class BattleMarkers {
  private readonly player
  private readonly enemy
  private readonly instruments: HTMLElement[]
  private panels: Box[] = []
  private size = { w: 0, h: 0 }
  private tagWidth = 0
  private playerAbove = true

  constructor(private layer: HTMLElement, playerName: string, enemyName: string) {
    layer.style.visibility = 'hidden'
    this.player = shipMarker(layer, 'player', playerName)
    this.enemy = shipMarker(layer, 'enemy', enemyName)
    this.instruments = Array.from(layer.closest('.air-duel')!.querySelectorAll('.duel-readouts, .duel-heading, .duel-wind, .duel-console, .drill-coach, .duel-foot'))
    this.resize()
  }

  resize() {
    const viewport = this.layer.getBoundingClientRect()
    this.size = { w: viewport.width, h: viewport.height }
    this.tagWidth = Math.min(144, Math.max(90, Math.round(viewport.width / 10)))
    this.layer.style.setProperty('--marker-width', this.tagWidth + 'px')
    this.panels = this.instruments.map(el => {
      const r = el.getBoundingClientRect()
      return { x: r.left - viewport.left - 3, y: r.top - viewport.top - 3, w: r.width + 6, h: r.height + 6 }
    })
  }

  update(player: Vessel, enemy: Vessel, crew: CrewPair, maximum: CrewPair, touching: boolean, scrollX: number, scrollY: number) {
    this.layer.style.visibility = 'visible'
    const scale = this.size.w / SKY.width
    const ships = [player, enemy] as const
    const bounds = ships.map(ship => {
      const sin = Math.abs(Math.sin(ship.heading)), cos = Math.abs(Math.cos(ship.heading))
      const w = (114 * cos + 44 * sin) * scale, h = (114 * sin + 44 * cos) * scale
      return { x: (ship.x - scrollX) * scale - w / 2, y: (ship.y - scrollY) * scale - h / 2, w, h }
    }) as [Box, Box]
    if (Math.abs(player.y - enemy.y) * scale > 6) this.playerAbove = player.y < enemy.y
    const labels = placeShipMarkers(bounds, this.panels, this.size, { w: this.tagWidth, h: touching ? 47 : 32 }, this.playerAbove)
    this.layer.classList.toggle('boarding', touching)
    for (const [i, side] of sides.entries()) {
      const marker = this[side], ship = ships[i], box = labels[i]
      marker.tag.hidden = ship.hull <= 0
      marker.tag.style.transform = `translate(${box.x}px,${box.y}px)`
      marker.hull.style.transform = `scaleX(${Math.max(0, ship.hull / ship.maxHull)})`
      if (touching) marker.crew.style.transform = `scaleX(${Math.max(0, crew[side] / maximum[side])})`

      const cx = (ship.x - scrollX) * scale, cy = (ship.y - scrollY) * scale
      const x = Math.max(box.x, Math.min(box.x + box.w, cx)), y = Math.max(box.y, Math.min(box.y + box.h, cy))
      const edge = Math.max(2 * Math.abs(cx - x) / bounds[i].w, 2 * Math.abs(cy - y) / bounds[i].h)
      const length = edge > 1 ? Math.hypot(cx - x, cy - y) * (1 - 1 / edge) : 0
      marker.leader.hidden = !touching || length <= 3 || ship.hull <= 0
      if (!marker.leader.hidden) {
        marker.leader.style.width = length + 'px'
        marker.leader.style.transform = `translate(${x}px,${y}px) rotate(${Math.atan2(cy - y, cx - x)}rad)`
      }
    }
  }
}
