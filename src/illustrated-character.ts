import { artwork } from './artwork'
import type { PortId } from './data'
import './illustrated-character.css'

// Pixel registration in the original 1672 × 941 quay plates. Each transparent
// frame restores just the pixels vacated by the painted head and neck.
const crops: Record<PortId, readonly [number, number, number, number]> = {
  sunstep: [408, 505, 195, 205],
  glasshouse: [286, 548, 208, 210],
  copperfall: [367, 495, 200, 208],
  meridian: [337, 482, 200, 208],
}

export function mountIllustratedCharacter(
  plate: HTMLElement,
  port: PortId,
  localButton: HTMLButtonElement,
  lit = false,
): () => void {
  localButton.classList.add('illustrated-person-target')
  const layer = document.createElement('div')
  layer.className = 'illustrated-character'
  layer.dataset.illustratedCharacter = port
  layer.setAttribute('aria-hidden', 'true')

  const [x, y, width, height] = crops[port]
  const window = document.createElement('div')
  window.className = 'illustrated-character-crop'
  Object.assign(window.style, {
    left: (x / 1672) * 100 + '%',
    top: (y / 941) * 100 + '%',
    width: (width / 1672) * 100 + '%',
    height: (height / 941) * 100 + '%',
  })
  const image = document.createElement('img')
  image.alt = ''
  image.draggable = false
  image.decoding = 'async'
  const dusk = lit && (port === 'sunstep' || port === 'glasshouse') ? '-lit' : ''
  image.src = artwork('harbor-people/' + port + dusk + '-turn')
  window.append(image)
  layer.append(window)
  // Weather and particles continue to pass in front of the figure.
  const weather = plate.querySelector('.scene-weather, .quay-air, .quay-spot')
  plate.insertBefore(layer, weather)

  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController()
  const { signal } = events
  const overlay = plate.closest('.quay')?.querySelector('.quay-overlay')
  let hover = false
  let focus = localButton === document.activeElement
  let touching = false
  let pose = -1
  let target = -1
  let timer: ReturnType<typeof setTimeout> | undefined

  function draw(index: number) {
    pose = index
    layer.dataset.pose = ['working', 'profile', 'three-quarter', 'front'][index + 1]
    window.hidden = index < 0
    if (index >= 0) image.style.transform = 'translateX(' + (-100 * index) / 3 + '%)'
  }
  function step() {
    clearTimeout(timer)
    if (pose === target) return
    draw(reduced.matches ? target : pose + Math.sign(target - pose))
    if (pose !== target) timer = setTimeout(step, pose === 1 ? 115 : 82)
  }
  function attention() {
    const next = hover || focus || touching || overlay?.querySelector('.dock-talk') ? 2 : -1
    if (next === target) return
    target = next
    step()
  }
  localButton.addEventListener('pointerenter', (event) => {
    hover = event.pointerType !== 'touch'
    attention()
  }, { signal })
  localButton.addEventListener('pointerleave', () => {
    hover = false
    attention()
  }, { signal })
  localButton.addEventListener('focus', () => { focus = true; attention() }, { signal })
  localButton.addEventListener('blur', () => { focus = false; attention() }, { signal })
  localButton.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') { touching = true; attention() }
  }, { signal })
  const liftFinger = () => { touching = false; attention() }
  localButton.addEventListener('pointerup', liftFinger, { signal })
  localButton.addEventListener('pointercancel', liftFinger, { signal })
  const watch = new MutationObserver(attention)
  if (overlay) watch.observe(overlay, { childList: true })
  reduced.addEventListener('change', step, { signal })
  draw(-1)
  attention()

  return () => {
    events.abort()
    watch.disconnect()
    clearTimeout(timer)
    layer.remove()
    localButton.classList.remove('illustrated-person-target')
  }
}
