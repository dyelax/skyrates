import { loadGame, saveGame, SAVE_KEY } from './model'

const companion = 'http://127.0.0.1:4817'
const publicOrigin = 'https://dyelax.github.io'
const sharePath = '/skyrates/'

// Transfer only the captain's local game save between editions. Provider sessions
// stay in their respective origin. The receiving captain confirms replacement.
export function carryCaptain(message: (text: string) => void) {
  const remote = window.open(companion + '/?transfer=1', '_blank')
  if (!remote) {
    message('Allow the local edition window, then try again.')
    return
  }
  const stop = new AbortController()
  const timeout = setTimeout(() => {
    stop.abort()
    message(
      'Start the local edition and try again, or open it from the setup guide.',
    )
  }, 18000)
  window.addEventListener(
    'message',
    (event) => {
      if (
        event.origin !== companion ||
        event.source !== remote ||
        event.data?.type !== 'skyrates-ready'
      )
        return
      remote.postMessage(
        { type: 'skyrates-papers', save: JSON.stringify(loadGame()) },
        companion,
      )
      clearTimeout(timeout)
      stop.abort()
      message('Your ship’s papers are ready in the local edition.')
    },
    { signal: stop.signal },
  )
}
export function receiveCaptain() {
  if (
    location.origin !== companion ||
    !new URLSearchParams(location.search).has('transfer') ||
    !window.opener
  )
    return
  const remote = window.opener as Window
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(), 18000)
  window.addEventListener(
    'message',
    (event) => {
      if (
        event.origin !== publicOrigin ||
        event.source !== remote ||
        event.data?.type !== 'skyrates-papers'
      )
        return
      const raw = event.data.save
      if (typeof raw !== 'string' || raw.length > 2000000) return
      const restored = loadGame({ getItem: () => raw })
      if (JSON.stringify(restored) !== raw) return
      stop.abort()
      clearTimeout(timer)
      const dlg = document.createElement('dialog')
      dlg.className = 'voice-room'
      const title = document.createElement('h2')
      title.textContent = 'Bring your captain aboard?'
      const copy = document.createElement('p')
      copy.textContent = `Day ${restored.day} · ${restored.coins} crowns. This replaces the captain saved in this local edition. A copy of the previous ship’s papers stays in this browser.`
      const yes = document.createElement('button')
      yes.textContent = 'Import this captain'
      const no = document.createElement('button')
      no.textContent = 'Keep my local captain'
      dlg.append(title, copy, yes, no)
      document.body.append(dlg)
      dlg.showModal()
      dlg.onclose = () => dlg.remove()
      yes.onclick = () => {
        try {
          const previous = localStorage.getItem(SAVE_KEY)
          if (previous) localStorage.setItem('skyrates.before-import', previous)
          if (!saveGame(restored)) throw Error()
          location.replace('/?voices=1')
        } catch {
          copy.textContent =
            'The ship’s papers could not be saved. Your existing captain is still aboard.'
        }
      }
      no.onclick = () => dlg.close()
    },
    { signal: stop.signal },
  )
  remote.postMessage({ type: 'skyrates-ready', path: sharePath }, publicOrigin)
}
