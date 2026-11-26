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
    // A short offset gives the leader room to point back to the hull while
    // keeping both names clear of ships that are alongside one another.
    return place(s.x + s.w * .66 + 8, above ? edge - tag.h - 12 : edge + 12)
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

function shipMarker(layer: HTMLElement, lines: SVGSVGElement, side: Side, fullName: string) {
  const leader = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  leader.classList.add('ship-leader')
  lines.append(leader)

  const tag = document.createElement('div')
  tag.className = 'ship-marker'
  tag.dataset.ship = side
  tag.setAttribute('role', 'group')
  tag.setAttribute('aria-label', fullName)
  const name = document.createElement('strong')
  name.textContent = side === 'player' ? 'You' : fullName
  tag.append(name)
  function meter(label: 'Hull' | 'Crew') {
    const row = document.createElement('span')
    row.className = label === 'Crew' ? 'ship-meter crew-meter' : 'ship-meter'
    row.setAttribute('role', 'meter')
    row.setAttribute('aria-label', label)
    row.setAttribute('aria-valuemin', '0')
    row.innerHTML = label + ' <i><b></b></i>'
    tag.append(row)
    return { row, fill: row.querySelector('b')!, now: NaN, max: NaN }
  }
  const hull = meter('Hull'), crew = meter('Crew')
  layer.append(tag)
  return { tag, leader, hull, crew }
}

type ShipMeter = ReturnType<typeof shipMarker>['hull']
function setMeter(meter: ShipMeter, current: number, maximum: number) {
  if (meter.now === current && meter.max === maximum) return
  const remaining = Math.max(0, Math.min(maximum, current))
  meter.fill.style.transform = `scaleX(${maximum > 0 ? remaining / maximum : 0})`
  meter.row.setAttribute('aria-valuenow', String(remaining))
  meter.row.setAttribute('aria-valuemax', String(maximum))
  function read(value: number) {
    if (value > 0 && value < .1) return 'less than 0.1'
    return String(Math.round(value * 10) / 10)
  }
  meter.row.setAttribute('aria-valuetext', read(remaining) + ' of ' + read(maximum))
  meter.now = current
  meter.max = maximum
}

// End at the oblique ship's silhouette. An axis-aligned bounding box ends the
// line in open sky when the hull is diagonal, particularly on a wide chart.
function leaderPath(box: Box, cx: number, cy: number, heading: number, scale: number) {
  const toward = cx < box.x + box.w / 2 ? -1 : 1
  const x = toward < 0 ? box.x : box.x + box.w
  const y = Math.min(box.y + box.h - 3, Math.max(box.y + 3, cy))
  const elbow = x + toward * 5
  const dx = elbow - cx, dy = y - cy
  const fore = 0.5 * 108 * scale, beam = 0.5 * 35 * scale
  const longitudinal = (dx * Math.cos(heading) + dy * Math.sin(heading)) / fore
  const lateral = (dy * Math.cos(heading) - dx * Math.sin(heading)) / beam
  const distance = Math.hypot(longitudinal, lateral)
  if (distance <= 1) return ''
  return `M ${x} ${y} H ${elbow} L ${cx + dx / distance} ${cy + dy / distance}`
}

// Native text and bars stay legible at a fixed CSS size while the battle camera zooms.
export class BattleMarkers {
  private readonly player
  private readonly enemy
  private panels: Box[] = []
  private size = { w: 0, h: 0 }
  private tagWidth = 0
  private playerAbove = true

  constructor(private layer: HTMLElement, playerName: string, enemyName: string) {
    layer.style.visibility = 'hidden'
    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    lines.classList.add('ship-leaders')
    lines.setAttribute('aria-hidden', 'true')
    layer.append(lines)
    this.player = shipMarker(layer, lines, 'player', playerName)
    this.enemy = shipMarker(layer, lines, 'enemy', enemyName)
    this.resize()
  }

  resize() {
    const viewport = this.layer.getBoundingClientRect()
    this.size = { w: viewport.width, h: viewport.height }
    this.tagWidth = Math.min(144, Math.max(90, Math.round(viewport.width / 10)))
    this.layer.style.setProperty('--marker-width', this.tagWidth + 'px')
    this.panels = []
    const instruments = this.layer.ownerDocument.querySelectorAll<HTMLElement>('[data-marker-obstacle]')
    instruments.forEach(el => {
      if (el.closest('[hidden]')) return
      // The campaign toast lives outside the battle. A fading or hidden panel
      // must release its sky space even if its box still has a measurable size.
      const style = getComputedStyle(el)
      if (style.visibility !== 'visible' || Number(style.opacity) === 0) return
      const r = el.getBoundingClientRect()
      if (r.width && r.height && r.right > viewport.left && r.left < viewport.right && r.bottom > viewport.top && r.top < viewport.bottom) {
        this.panels.push({ x: r.left - viewport.left - 3, y: r.top - viewport.top - 3, w: r.width + 6, h: r.height + 6 })
      }
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
    const labels = placeShipMarkers(bounds, this.panels, this.size, { w: this.tagWidth, h: 47 }, this.playerAbove)
    this.layer.classList.toggle('boarding', touching)
    for (const [i, side] of sides.entries()) {
      const marker = this[side], ship = ships[i], box = labels[i]
      marker.tag.hidden = ship.hull <= 0
      marker.tag.style.transform = `translate(${box.x}px,${box.y}px)`
      setMeter(marker.hull, ship.hull, ship.maxHull)
      setMeter(marker.crew, crew[side], maximum[side])

      const cx = (ship.x - scrollX) * scale, cy = (ship.y - scrollY) * scale
      marker.leader.setAttribute('d', ship.hull > 0 ? leaderPath(box, cx, cy, ship.heading, scale) : '')
    }
  }
}
