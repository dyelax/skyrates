import { bell, soundEnabled, toggleSound } from './audio'
import './prologue.css'

const shots = [
  {
    plate: 'last-watch',
    place: 'Glasshouse Reach',
    title: 'The last flash',
    voice: 'Keeper Iona · lamp log',
    line: 'Six weeks ago the beacon went black. Out in the cloud, a mail pilot flashed his lamp three times. Nobody on the quay could tell him which way was home.',
    sound: 'select',
  },
  {
    plate: 'dead-letters',
    place: 'Sunstep Quay',
    title: 'The letters kept coming',
    voice: 'Your first watch',
    line: 'You used to run these quays on foot. You know who sews the green mail sacks and whose boy waits for a letter at the high station. Six bags now. His is at the bottom.',
    sound: 'dock',
  },
  {
    plate: 'first-command',
    place: 'Aboard the Wayfarer',
    title: 'A ship of your own',
    voice: 'Harbormaster Vale',
    line: '“I need someone who knows what’s in those bags. Take the Wayfarer. Bring Iona my seal and back her new lens. Get that light witnessed and Meridian pays you back, with sixty crowns besides.”',
    sound: 'mission',
  },
] as const

export function openPrologue(onFinish?: () => void) {
  const dialog = document.createElement('dialog')
  dialog.className = 'prologue'
  dialog.setAttribute('aria-label', 'The first watch · opening story')
  dialog.innerHTML =
    '<div class="prologue-frames" aria-hidden="true"></div><div class="prologue-letterbox"></div><div class="prologue-tools"><a href="battle-test.html">Battle test</a><button data-sound></button><button data-skip>Skip intro</button></div><div class="prologue-copy" aria-live="polite"><small></small><h1></h1><p></p><cite></cite></div><div class="prologue-foot"><div class="prologue-reel" aria-hidden="true"><i></i><i></i><i></i></div><button data-next></button></div>'
  const frames = dialog.querySelector<HTMLElement>('.prologue-frames')!
  const plates = shots.map((s) => {
    const img = document.createElement('img')
    img.src = import.meta.env.BASE_URL + 'art/' + s.plate + '.webp'
    img.alt = ''
    frames.append(img)
    return img
  })
  const btn = (name: string) =>
    dialog.querySelector<HTMLButtonElement>('[data-' + name + ']')!
  let index = 0
  let finished = false
  function controls() {
    btn('sound').textContent = soundEnabled() ? 'Sound on' : 'Sound off'
    btn('sound').setAttribute('aria-pressed', String(soundEnabled()))
  }
  function finish() {
    if (finished) return
    finished = true
    dialog.close()
    dialog.remove()
    onFinish?.()
  }
  function draw() {
    const shot = shots[index]
    plates.forEach((plate, i) => plate.classList.toggle('showing', i === index))
    dialog.querySelector('small')!.textContent = shot.place
    dialog.querySelector('h1')!.textContent = shot.title
    dialog.querySelector('p')!.textContent = shot.line
    dialog.querySelector('cite')!.textContent = shot.voice
    btn('next').textContent =
      index === shots.length - 1 ? 'Take the helm →' : 'Next →'
    bell(shot.sound)
    dialog.querySelectorAll('.prologue-reel i').forEach((bar, i) => {
      bar.classList.toggle('read', i <= index)
    })
  }
  function next() {
    if (index < shots.length - 1) {
      index++
      draw()
    } else finish()
  }
  btn('skip').onclick = finish
  btn('next').onclick = next
  btn('sound').onclick = () => {
    toggleSound()
    controls()
  }
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault()
    finish()
  })
  document.body.append(dialog)
  dialog.showModal()
  controls()
  draw()
  btn('next').focus({ preventScroll: true })
}
