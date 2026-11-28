import type { Point } from './battle-model'
import { PORT_IDS, PORTS, type PortId } from './data'
import { icon } from './icons'
import { WORLD_PORTS, WORLD_TOWNS, worldCoastRadius, type WorldFlight } from './world-flight'
import { skyIsletsNear, isletOutline } from './world-islets'
import './world-flight-minimap.css'

type Scale = 'nearby' | 'region'
const localWidth = 2600
const prefKey = 'skyrates.flight.minimap.v1'
interface Preferences {
  visible?: boolean
  scale: Scale
}

function preferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(prefKey) ?? '{}')
    return {
      visible: typeof saved.visible === 'boolean' ? saved.visible : undefined,
      scale: saved.scale === 'nearby' ? 'nearby' : 'region',
    }
  } catch {
    return { scale: 'region' }
  }
}

// Use the same coastline that guides the hull around each port.
const portOutlines = Object.fromEntries(
  PORT_IDS.map((id) => {
    const { center, island } = WORLD_TOWNS[id]
    return [
      id,
      Array.from({ length: 64 }, (_, i) => {
        const angle = (i * Math.PI) / 32,
          radius = worldCoastRadius(id, angle)
        return {
          x: center.x + island.rx * radius * Math.cos(angle),
          y: center.y + island.ry * radius * Math.sin(angle),
        }
      }),
    ]
  }),
) as Record<PortId, Point[]>

export function mountFlightMinimap(root: HTMLElement, unlocked: (port: PortId) => boolean) {
  const prefs = preferences()
  const panel = document.createElement('aside')
  panel.className = 'flight-minimap'
  panel.id = 'flight-minimap'
  panel.setAttribute('aria-label', 'Mini-map')
  panel.hidden = true
  panel.innerHTML =
    '<canvas role="img"></canvas><div class="flight-minimap-scales" role="group" aria-label="Map scale"><button type="button" data-scale="nearby">Nearby</button><button type="button" data-scale="region">Region</button></div>'
  const canvas = panel.querySelector('canvas')!
  const ctx = canvas.getContext('2d')!
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.innerHTML = icon('radar')
  toggle.setAttribute('aria-controls', panel.id)
  toggle.setAttribute('aria-keyshortcuts', 'M')
  root.querySelector('.flight-top-actions')!.prepend(toggle)
  root.append(panel)

  const stop = new AbortController()
  const scales = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-scale]'))
  let flight: WorldFlight | undefined,
    waypoint: PortId | null | undefined,
    underway = false
  let lastDraw = -Infinity,
    width = 0,
    height = 0,
    pixelRatio = 1
  let surveyAt: Point | undefined
  let islets: { outline: readonly Point[]; color: string }[] = []

  function remember() {
    try {
      localStorage.setItem(prefKey, JSON.stringify(prefs))
    } catch {
      /* Map preferences are optional in private sessions. */
    }
  }
  function controls() {
    const open = prefs.visible ?? underway
    panel.hidden = !open
    toggle.title = (open ? 'Hide' : 'Show') + ' mini-map (M)'
    toggle.setAttribute('aria-label', (open ? 'Hide' : 'Show') + ' mini-map')
    toggle.setAttribute('aria-expanded', String(open))
    for (const btn of scales) btn.setAttribute('aria-pressed', String(prefs.scale === btn.dataset.scale))
  }
  const changeVisible = () => {
    prefs.visible = panel.hidden
    remember()
    controls()
    draw()
  }
  toggle.addEventListener('click', changeVisible, { signal: stop.signal })
  for (const btn of scales)
    btn.addEventListener(
      'click',
      () => {
        prefs.scale = btn.dataset.scale as Scale
        remember()
        controls()
        draw()
      },
      { signal: stop.signal },
    )
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        e.defaultPrevented ||
        e.key.toLowerCase() !== 'm' ||
        e.repeat ||
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        root.closest('[inert]')
      )
        return
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || e.target.closest('input,textarea,select'))
      )
        return
      e.preventDefault()
      changeVisible()
    },
    { signal: stop.signal },
  )

  const observer = new ResizeObserver(([box]) => {
    width = box.contentRect.width
    height = box.contentRect.height
    if (!width || !height) return
    pixelRatio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    draw()
  })
  observer.observe(canvas)

  function draw() {
    if (!flight || panel.hidden || !width || !height || !ctx) return
    const player = flight.player,
      local = prefs.scale === 'nearby'
    let originX = player.x,
      originY = player.y,
      units = localWidth / width
    if (!local) {
      // Keep the ship in the chart even when the captain sails beyond the ports.
      const pins = [player, ...Object.values(WORLD_PORTS)]
      const l = Math.min(...pins.map((p) => p.x)),
        r = Math.max(...pins.map((p) => p.x))
      const t = Math.min(...pins.map((p) => p.y)),
        b = Math.max(...pins.map((p) => p.y))
      units = Math.max((r - l) / (width - 46), (b - t) / (height - 43), 1)
      originX = (l + r) / 2
      originY = (t + b) / 2
    }
    const project = (p: Point) => ({
      x: (p.x - originX) / units + width / 2,
      y: (p.y - originY) / units + height / 2,
    })
    const circle = (x: number, y: number, radius: number, color: string) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const spacing = local ? 500 : Math.max(5000, 10 ** Math.ceil(Math.log10(units * 8)))
    const topLeft = { x: originX - (width * units) / 2, y: originY - (height * units) / 2 }
    ctx.strokeStyle = '#bed9ce24'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    for (let x = Math.ceil(topLeft.x / spacing) * spacing; x < topLeft.x + width * units; x += spacing) {
      const px = (x - topLeft.x) / units
      ctx.moveTo(px, 0)
      ctx.lineTo(px, height)
    }
    for (let y = Math.ceil(topLeft.y / spacing) * spacing; y < topLeft.y + height * units; y += spacing) {
      const py = (y - topLeft.y) / units
      ctx.moveTo(0, py)
      ctx.lineTo(width, py)
    }
    ctx.stroke()

    if (local) {
      if (!surveyAt || Math.hypot(player.x - surveyAt.x, player.y - surveyAt.y) > 290) {
        surveyAt = { x: player.x, y: player.y }
        islets = skyIsletsNear(player, localWidth * 0.9).map((islet) => ({
          outline: isletOutline(islet),
          color: islet.color,
        }))
      }
      const coastline = (outline: readonly Point[], color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        outline.forEach((vertex, i) => {
          const p = project(vertex)
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.closePath()
        ctx.fill()
      }
      for (const islet of islets) coastline(islet.outline, islet.color)
      for (const id of PORT_IDS) {
        const town = WORLD_TOWNS[id]
        if (Math.hypot(town.center.x - player.x, town.center.y - player.y) < localWidth)
          coastline(portOutlines[id], '#91a383')
      }
    }
    const ship = project(player)
    if (waypoint) {
      const to = project(WORLD_PORTS[waypoint])
      ctx.strokeStyle = '#edcd86b3'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(ship.x, ship.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const small = width < 155
    ctx.font = (small ? '10' : '11') + 'px Barlow, sans-serif'
    ctx.textBaseline = 'middle'
    for (const id of PORT_IDS) {
      const at = project(WORLD_PORTS[id]),
        selected = id === waypoint
      if (at.x < -3 || at.y < -3 || at.x > width + 3 || at.y > height + 3) continue
      const color = selected ? '#f4cb7b' : unlocked(id) ? '#c6d5bc' : '#88a6a3'
      ctx.fillStyle = '#203d41'
      ctx.strokeStyle = color
      ctx.lineWidth = selected ? 1.8 : 1.2
      ctx.beginPath()
      ctx.moveTo(at.x, at.y - 3.8)
      ctx.lineTo(at.x + 3.8, at.y)
      ctx.lineTo(at.x, at.y + 3.8)
      ctx.lineTo(at.x - 3.8, at.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      const label = PORTS[id].name.split(' ')[0]
      const right = at.x + 6 + ctx.measureText(label).width < width - 2
      ctx.textAlign = right ? 'left' : 'right'
      ctx.fillStyle = color
      // Offset the text from the diamond even when the pilot is moored on top of it.
      ctx.fillText(label, at.x + (right ? 6 : -6), at.y - 3)
    }
    if (local) {
      for (const actor of flight.traffic) {
        if (actor.behavior === 'struck') continue
        const at = project(actor.ship)
        if (at.x < 0 || at.x > width || at.y < 0 || at.y > height) continue
        const hostile = actor.disposition === 'hostile'
        circle(at.x, at.y, hostile ? 2.5 : 1.9, hostile ? '#f39778' : '#9bd4d6')
      }
    }
    ctx.save()
    ctx.translate(ship.x, ship.y)
    ctx.rotate(player.heading)
    ctx.fillStyle = '#ffdd8e'
    ctx.strokeStyle = '#16373b'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(6, 0)
    ctx.lineTo(-4.4, 3.9)
    ctx.lineTo(-2.6, 0)
    ctx.lineTo(-4.4, -3.9)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#eee4c9'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = '600 10px Barlow, sans-serif'
    ctx.fillText('N', 7, 10)
    const distance = local ? 500 : 5000
    const bar = distance / units
    ctx.strokeStyle = '#ddcda4'
    ctx.beginPath()
    ctx.moveTo(7, height - 7)
    ctx.lineTo(7, height - 4)
    ctx.lineTo(7 + bar, height - 4)
    ctx.lineTo(7 + bar, height - 7)
    ctx.stroke()
    ctx.fillText(local ? '500 m' : '5 km', 7, height - 13)
    const distanceTo = (port: PortId) =>
      Math.hypot(player.x - WORLD_PORTS[port].x, player.y - WORLD_PORTS[port].y)
    const nearest = PORT_IDS.reduce((a, b) => (distanceTo(a) < distanceTo(b) ? a : b))
    const km = distanceTo(nearest) / 1000
    const description =
      'North-up ' +
      (local ? 'nearby' : 'regional') +
      ' mini-map. ' +
      km.toFixed(1) +
      ' km from ' +
      PORTS[nearest].name +
      (waypoint ? '. Course set for ' + PORTS[waypoint].name : '') +
      '.'
    if (canvas.getAttribute('aria-label') !== description) canvas.setAttribute('aria-label', description)
  }

  controls()
  return {
    update(next: WorldFlight, destination: PortId | null | undefined, isUnderway: boolean) {
      const changed = next !== flight || destination !== waypoint || isUnderway !== underway
      flight = next
      waypoint = destination
      if (underway !== isUnderway) {
        underway = isUnderway
        controls()
      }
      if (panel.hidden) return
      const now = performance.now()
      if (!changed && now - lastDraw < 100) return
      lastDraw = now
      draw()
    },
    destroy() {
      stop.abort()
      observer.disconnect()
      panel.remove()
      toggle.remove()
    },
  }
}
