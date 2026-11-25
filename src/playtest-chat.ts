import { icon } from './icons'
import type { GameState } from './model'
import { codexDraft, composeReport, describeGame, playtestThread } from './playtest-report'
import './playtest-chat.css'

const threadKey = 'skyrates.playtest.thread',
  draftKey = 'skyrates.playtest.draft',
  contextKey = 'skyrates.playtest.context'

function setting(key: string, session: boolean, set?: string | null): string | null {
  try {
    const storage = session ? window.sessionStorage : window.localStorage
    if (set === null) storage.removeItem(key)
    else if (set !== undefined) storage.setItem(key, set)
    return storage.getItem(key)
  } catch {
    return null
  }
}

function linkedThread() {
  const hash = new URLSearchParams(location.hash.slice(1))
  if (!hash.has('playtest')) return playtestThread(setting(threadKey, false))
  const thread = playtestThread(hash.get('playtest'))
  if (thread) setting(threadKey, false, thread)
  if (hash.get('playtest') === 'off') setting(threadKey, false, null)
  hash.delete('playtest')
  history.replaceState(
    history.state,
    '',
    location.pathname + location.search + (hash.size ? '#' + hash.toString() : ''),
  )
  return thread ?? playtestThread(setting(threadKey, false))
}

export function mountPlaytestChat(read: () => { state: GameState; view: string }) {
  let thread = linkedThread(),
    context = '',
    current = ''
  const launch = document.createElement('button')
  launch.type = 'button'
  launch.className = 'playtest-call'
  launch.title = 'Debug chat (F2)'
  launch.setAttribute('aria-label', 'Debug chat')
  launch.setAttribute('aria-haspopup', 'dialog')
  launch.innerHTML = icon('message-circle') + '<span>Debug chat</span>'
  const dialog = document.createElement('dialog')
  dialog.className = 'playtest-dialog'
  dialog.setAttribute('aria-labelledby', 'playtest-title')
  dialog.innerHTML = `<header><h2 id="playtest-title">Debug chat</h2><button type="button" data-close aria-label="Close debug chat">${icon('x')}</button></header>
  <form><label for="playtest-question">Ask about the game or describe what went wrong.</label>
  <textarea id="playtest-question" rows="4" maxlength="2000" placeholder="Type here or start in Codex."></textarea>
  <details><summary>Game context</summary><pre data-context></pre><button type="button" class="playtest-forget" data-refresh hidden>Use current game context</button></details>
  <a class="playtest-open" data-desktop>Open in Codex</a>
  <p class="playtest-destination"></p>
  <details><summary>Use Codex on the web</summary><p>Copy your report, open Codex Web and paste it into a chat for the Skyrates repository.</p><div class="playtest-web"><button type="button" data-copy>Copy report</button><a href="https://chatgpt.com/codex" target="_blank" rel="noopener noreferrer">Open Codex Web ↗</a></div><textarea data-manual rows="6" readonly hidden aria-label="Report to copy"></textarea></details>
  <button class="playtest-forget" type="button" data-forget>Unlink playtest thread</button>
  <p class="playtest-status" role="status"></p></form>`
  document.body.append(dialog)
  const text = dialog.querySelector<HTMLTextAreaElement>('#playtest-question')!
  const native = dialog.querySelector<HTMLAnchorElement>('[data-desktop]')!
  const copy = dialog.querySelector<HTMLButtonElement>('[data-copy]')!
  const status = dialog.querySelector<HTMLElement>('.playtest-status')!
  const manual = dialog.querySelector<HTMLTextAreaElement>('[data-manual]')!
  const forget = dialog.querySelector<HTMLButtonElement>('[data-forget]')!
  const refresh = dialog.querySelector<HTMLButtonElement>('[data-refresh]')!
  const report = () => composeReport(text.value, context)

  function syncDraft() {
    const valid = !!text.value.trim()
    if (!valid) context = current
    dialog.querySelector<HTMLElement>('[data-context]')!.textContent = context
    refresh.hidden = context === current
    native.href = !valid && thread ? 'codex://threads/' + thread : codexDraft(thread, report())
    copy.disabled = !valid
    manual.hidden = true
    status.textContent = ''
    forget.hidden = !thread
    dialog.querySelector<HTMLElement>('.playtest-destination')!.textContent = thread
      ? 'Review your message in the linked playtest chat.'
      : 'Review your message in a new Codex chat.'
  }
  function positionLaunch() {
    // Native dialogs live in the top layer. Keep the radio accessible during the opening and in the handbook.
    const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]
      .filter((el) => el !== dialog)
      .at(-1)
    const target = modal ?? document.body
    if (launch.parentElement !== target) target.append(launch)
  }
  function open() {
    if (dialog.open) return
    const { state, view } = read()
    const scene = [...document.querySelectorAll<HTMLElement>('dialog[open],#main [role="dialog"]')].at(-1)
    const place = scene?.getAttribute('aria-label') ?? scene?.querySelector('h1,h2,h3')?.textContent ?? ''
    current = describeGame(state, view, place)
    if (view === 'battle') {
      const hull = document.querySelector('[data-read="player"]')?.textContent
      const range = document.querySelector('[data-read="range"]')?.textContent
      const speed = document.querySelector('[data-read="speed"]')?.textContent
      if (hull && range && speed)
        current += `
At the helm: hull ${hull}, ${speed}, range ${range}`
    }
    text.value = setting(draftKey, true) ?? text.value
    context = text.value.trim() ? (setting(contextKey, true) ?? (context || current)) : current
    syncDraft()
    dialog.showModal()
    text.focus()
    document.dispatchEvent(new CustomEvent('skyrates-playtest', { detail: true }))
  }
  launch.addEventListener('click', open)
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    document.dispatchEvent(new CustomEvent('skyrates-playtest', { detail: false }))
    positionLaunch()
    launch.focus({ preventScroll: true })
  })
  dialog.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'F2') {
      e.preventDefault()
      dialog.close()
    }
  })
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const b = dialog.getBoundingClientRect()
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close()
    }
  })
  text.addEventListener('input', () => {
    setting(draftKey, true, text.value || null)
    setting(contextKey, true, text.value.trim() ? context : null)
    syncDraft()
  })
  dialog.querySelector('form')!.addEventListener('submit', (e) => e.preventDefault())
  native.addEventListener('click', () => {
    if (text.value.trim()) status.textContent = 'Your draft is saved here while you open Codex.'
  })
  copy.addEventListener('click', async () => {
    const value = report()
    try {
      await navigator.clipboard.writeText(value)
      status.textContent = 'Report copied.'
    } catch {
      manual.hidden = false
      manual.value = value
      manual.select()
      status.textContent = 'Select Copy in your browser to copy the highlighted report.'
    }
  })
  refresh.addEventListener('click', () => {
    context = current
    setting(contextKey, true, context)
    syncDraft()
  })
  forget.addEventListener('click', () => {
    thread = null
    setting(threadKey, false, null)
    syncDraft()
    status.textContent = 'This browser opens a new Codex chat.'
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2' && !e.repeat) {
      e.preventDefault()
      open()
    }
  })
  // Game dialogs are appended directly to body. Their removal returns the button to the HUD.
  new MutationObserver(positionLaunch).observe(document.body, { childList: true })
  document.addEventListener(
    'toggle',
    (e) => {
      if (e.target instanceof HTMLDialogElement) positionLaunch()
    },
    true,
  )
  positionLaunch()
}
