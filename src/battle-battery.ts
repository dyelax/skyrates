import type { Gun, Side } from './battle-model'
import { GUN_POSITIONS } from './drill'

export function battery(side: Side, fitted: number): string {
  const count = GUN_POSITIONS.slice(0, fitted).filter(gun => gun.side === side).length
  if (!count) return ''
  const name = side === 'port' ? 'Port' : 'Starboard'
  const key = side === 'port' ? 'Q' : 'E'
  const label = count === 1 ? 'gun' : 'broadside'
  const pips = '<i class="battery-pip" data-loaded="true"></i>'.repeat(Math.min(6, count))
  return `<button type="button" class="battery-fire" data-action="${side}" data-marker-obstacle disabled
    aria-keyshortcuts="${side === 'port' ? 'Q 1 2' : 'E 3 4'}" aria-label="Fire ${side} ${label}, ${count} of ${count} ready"
    title="Fire loaded ${side} guns (${key})">
    <span class="battery-command" aria-hidden="true">${name} ${label}<kbd>${key}</kbd></span>
    <span class="battery-status" aria-hidden="true"><span class="battery-pips">${pips}</span><span class="battery-count">${count}/${count} ready</span></span>
  </button>`
}

export function syncBattery(button: HTMLButtonElement, side: Side, guns: readonly Gun[], locked: boolean, bearing: boolean): void {
  const fitted = guns.filter(gun => gun.side === side)
  button.hidden = !fitted.length
  if (button.hidden) return
  const ready = fitted.filter(gun => gun.cooldown <= 0 && gun.salvoIn === undefined).length
  button.disabled = locked || !ready
  button.classList.toggle('bearing', bearing && !button.disabled)
  const count = `${ready}/${fitted.length} ready`
  const counter = button.querySelector('.battery-count')!
  if (counter.textContent !== count) {
    counter.textContent = count
    const action = fitted.length === 1 ? 'gun' : 'broadside'
    button.setAttribute('aria-label', `Fire ${side} ${action}, ${ready} of ${fitted.length} ready`)
  }
  const bands = button.querySelectorAll<HTMLElement>('.battery-pip')
  const grouped = fitted.length > bands.length
  const next = Math.min(...fitted.filter(gun => gun.cooldown > 0).map(gun => gun.cooldown))
  const interval = fitted[0].reload / fitted.length
  const loading = Math.max(0, 1 - next / interval)
  bands.forEach((pip, index) => {
    const gun = fitted[index]
    const loaded = grouped ? ready * bands.length >= (index + 1) * fitted.length : gun.cooldown <= 0 && gun.salvoIn === undefined
    const partial = grouped ? (ready + loading) * bands.length / fitted.length - index : 1 - gun.cooldown / interval
    const fill = Math.round(100 * Math.min(1, Math.max(0, partial))) + '%'
    if (pip.dataset.loaded !== String(loaded)) pip.dataset.loaded = String(loaded)
    if (pip.style.getPropertyValue('--charge') !== fill) pip.style.setProperty('--charge', fill)
  })
}
