import type { RoomPoint } from './workshop-scenes'

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high))

/** Keep the painted scenery and its touch targets in one coordinate system while looking around. */
export function illustrateRoom(
  section: HTMLElement,
  plate: HTMLElement,
  picture: HTMLImageElement,
  startingPoint: RoomPoint,
  signal: AbortSignal,
) {
  const opts = { signal }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = 0, height = 0, plateWidth = 0, plateHeight = 0
  let frame = 0, moved = false, activePointer: number | null = null
  let startX = 0, startY = 0, dragX = 0, dragY = 0
  let x = 0, y = 0, parallaxX = 0, parallaxY = 0
  let anchorX = startingPoint[0] / 100, anchorY = startingPoint[1] / 100
  let lookX = 0, lookY = 0

  function paint() {
    frame = 0
    const spareX = Math.max(0, plateWidth - width)
    const spareY = Math.max(0, plateHeight - height)
    const targetX = clamp(anchorX * plateWidth - width / 2 + lookX * 7, 0, spareX)
    const targetY = clamp(anchorY * plateHeight - height / 2 + lookY * 5, 0, spareY)
    const fraction = motion.matches || activePointer !== null ? 1 : .19
    x += (targetX - x) * fraction
    y += (targetY - y) * fraction
    parallaxX += (lookX * 2.5 - parallaxX) * fraction
    parallaxY += (lookY * 1.5 - parallaxY) * fraction
    plate.style.transform = `translate3d(${-x}px,${-y}px,0)`
    section.style.setProperty('--rim-x', parallaxX.toFixed(2) + 'px')
    section.style.setProperty('--rim-y', parallaxY.toFixed(2) + 'px')
    if (Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(parallaxX - lookX * 2.5) > .15) schedule()
  }
  function schedule() { if (!frame && !signal.aborted) frame = requestAnimationFrame(paint) }
  function size() {
    width = section.clientWidth
    height = section.clientHeight
    if (!width || !height) return
    const ratio = picture.naturalWidth && picture.naturalHeight ? picture.naturalWidth / picture.naturalHeight : 16 / 9
    const overscan = motion.matches ? 1 : 1.035
    plateWidth = Math.max(width, height * ratio) * overscan
    plateHeight = plateWidth / ratio
    plate.style.width = plateWidth + 'px'
    plate.style.height = plateHeight + 'px'
    x = clamp(anchorX * plateWidth - width / 2, 0, plateWidth - width)
    y = clamp(anchorY * plateHeight - height / 2, 0, plateHeight - height)
    schedule()
  }
  function pointAt(point: RoomPoint) {
    anchorX = point[0] / 100
    anchorY = point[1] / 100
    lookX = lookY = 0
    schedule()
  }
  function nudge(dx: number, dy: number) {
    anchorX = (clamp(x + dx, 0, Math.max(0, plateWidth - width)) + width / 2) / plateWidth
    anchorY = (clamp(y + dy, 0, Math.max(0, plateHeight - height)) + height / 2) / plateHeight
    schedule()
  }
  plate.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return
    activePointer = event.pointerId
    moved = false
    startX = event.clientX; startY = event.clientY
    dragX = x; dragY = y
  }, opts)
  plate.addEventListener('pointermove', event => {
    if (!event.isPrimary) return
    if (activePointer === event.pointerId) {
      const dx = startX - event.clientX, dy = startY - event.clientY
      if (!moved && Math.abs(dx) + Math.abs(dy) < 7) return
      moved = true
      plate.setPointerCapture(event.pointerId)
      anchorX = (clamp(dragX + dx, 0, plateWidth - width) + width / 2) / plateWidth
      anchorY = (clamp(dragY + dy, 0, plateHeight - height) + height / 2) / plateHeight
    } else if (!motion.matches && event.pointerType !== 'touch') {
      const bounds = section.getBoundingClientRect()
      lookX = clamp((event.clientX - bounds.left) / width * 2 - 1, -1, 1)
      lookY = clamp((event.clientY - bounds.top) / height * 2 - 1, -1, 1)
    }
    schedule()
  }, opts)
  function release(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    activePointer = null
    if (plate.hasPointerCapture(event.pointerId)) plate.releasePointerCapture(event.pointerId)
  }
  window.addEventListener('pointerup', release, opts)
  window.addEventListener('pointercancel', release, opts)
  plate.addEventListener('click', event => {
    if (moved && (event as PointerEvent).detail !== 0) { event.preventDefault(); event.stopPropagation(); moved = false }
  }, { capture: true, signal })
  plate.addEventListener('pointerleave', () => { lookX = lookY = 0; schedule() }, opts)
  picture.addEventListener('load', size, opts)
  motion.addEventListener('change', size, opts)
  const observer = new ResizeObserver(size)
  observer.observe(section)
  size()
  signal.addEventListener('abort', () => { observer.disconnect(); cancelAnimationFrame(frame) }, { once: true })
  return { pointAt, nudge }
}
