import type { RoomPoint } from './workshop-scenes'

/** Keep locations registered to one still painting when its edges extend past the screen. */
export function mountRoomPan(
  viewport: HTMLElement,
  plate: HTMLElement,
  picture: HTMLImageElement,
  entrance: RoomPoint,
  signal: AbortSignal,
) {
  const opts = { signal }
  let center: RoomPoint = entrance
  let drag: { id: number; x: number; y: number; left: number; top: number } | undefined
  let dragged = false

  function pointAt([x, y]: RoomPoint) {
    viewport.scrollTo({
      left: plate.offsetWidth * x / 100 - viewport.clientWidth / 2,
      top: plate.offsetHeight * y / 100 - viewport.clientHeight / 2,
      behavior: 'instant',
    })
  }
  function reveal(point: RoomPoint) {
    const x = plate.offsetWidth * point[0] / 100 - viewport.scrollLeft
    const y = plate.offsetHeight * point[1] / 100 - viewport.scrollTop
    if (x < 28 || y < 28 || x > viewport.clientWidth - 28 || y > viewport.clientHeight - 28) pointAt(point)
  }
  function nudge(dx: number, dy: number) {
    viewport.scrollBy({ left: dx, top: dy, behavior: 'instant' })
  }
  function size() {
    const w = viewport.clientWidth, h = viewport.clientHeight
    if (!w || !h) return
    const ratio = picture.naturalWidth && picture.naturalHeight ? picture.naturalWidth / picture.naturalHeight : 16 / 9
    const width = Math.max(w, h * ratio), height = width / ratio
    plate.style.width = width + 'px'
    plate.style.height = height + 'px'
    viewport.classList.toggle('pannable', width - w > 1 || height - h > 1)
    pointAt(center)
  }

  viewport.addEventListener('scroll', () => {
    if (plate.offsetWidth && plate.offsetHeight) center = [
      (viewport.scrollLeft + viewport.clientWidth / 2) * 100 / plate.offsetWidth,
      (viewport.scrollTop + viewport.clientHeight / 2) * 100 / plate.offsetHeight,
    ]
  }, { ...opts, passive: true })

  // Touch and trackpads use native scrolling. Dragging with a mouse moves the same viewport.
  plate.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return
    dragged = false
    if (event.pointerType !== 'mouse') return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }
  }, opts)
  plate.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return
    const dx = drag.x - event.clientX, dy = drag.y - event.clientY
    if (!dragged && Math.abs(dx) + Math.abs(dy) < 7) return
    dragged = true
    plate.setPointerCapture(event.pointerId)
    viewport.scrollTo({ left: drag.left + dx, top: drag.top + dy, behavior: 'instant' })
  }, opts)
  function release(event: PointerEvent) {
    if (drag?.id !== event.pointerId) return
    drag = undefined
    if (plate.hasPointerCapture(event.pointerId)) plate.releasePointerCapture(event.pointerId)
  }
  window.addEventListener('pointerup', release, opts)
  window.addEventListener('pointercancel', release, opts)
  plate.addEventListener('click', event => {
    if (dragged && event.detail !== 0) {
      dragged = false
      event.preventDefault()
      event.stopPropagation()
    }
  }, { ...opts, capture: true })

  picture.addEventListener('load', size, opts)
  const observer = new ResizeObserver(size)
  observer.observe(viewport)
  size()
  signal.addEventListener('abort', () => observer.disconnect(), { once: true })
  return { pointAt, reveal, nudge }
}
