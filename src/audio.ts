const KEY = 'skyrates.sound'
let context: AudioContext | null = null
let wind: AudioBufferSourceNode | null = null
let enabled = false
try {
  enabled = localStorage.getItem(KEY) === 'on'
} catch {
  /* Storage is optional. */
}

export function soundEnabled() {
  return enabled
}

function audio() {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume().catch(() => {})
  return context
}

export function beginAmbience() {
  if (!enabled || wind || typeof AudioContext === 'undefined') return
  const ctx = audio()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const samples = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < samples.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04
    samples[i] = last * Math.sin((Math.PI * i) / samples.length) ** 2
  }
  wind = ctx.createBufferSource()
  wind.buffer = buf
  wind.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  const level = ctx.createGain()
  level.gain.value = 0.17
  wind.connect(filter).connect(level).connect(ctx.destination)
  wind.start()
}

export function bell(event: 'select' | 'trade' | 'dock' | 'mission') {
  if (!enabled || typeof AudioContext === 'undefined') return
  const ctx = audio()
  const notes = { select: [392], trade: [660, 880], dock: [392, 587], mission: [392, 493.88, 587.33, 783.99] }[
    event
  ]
  notes.forEach((hz, i) => {
    const start = ctx.currentTime + i * 0.12
    const end = start + (event === 'select' ? 0.08 : 0.7)
    const osc = ctx.createOscillator(),
      gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = hz
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(event === 'select' ? 0.018 : 0.065, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(end)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  })
}

export function toggleSound() {
  enabled = !enabled
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off')
  } catch {
    /* Keep the session preference. */
  }
  if (enabled) {
    beginAmbience()
    bell('dock')
  } else if (wind) {
    wind.stop()
    wind.disconnect()
    wind = null
  }
}

const battleVoices = {
  cannon: { duration: 0.48, filter: 'lowpass', from: 1850, to: 140, pitch: 115, tail: 33, level: 0.21 },
  hit: { duration: 0.26, filter: 'lowpass', from: 2400, to: 140, pitch: 115, tail: 33, level: 0.21 },
  grapple: { duration: 0.38, filter: 'bandpass', from: 2400, to: 420, pitch: 280, tail: 48, level: 0.21 },
  impact: { duration: 0.23, filter: 'bandpass', from: 1100, to: 170, pitch: 140, tail: 55, level: 0.19 },
  wreck: { duration: 0.98, filter: 'lowpass', from: 1750, to: 70, pitch: 196, tail: 29, level: 0.18 },
} as const

export function battleSound(event: keyof typeof battleVoices, strength = 1) {
  if (!enabled || typeof AudioContext === 'undefined') return
  const ctx = audio()
  const start = ctx.currentTime
  const voice = battleVoices[event]
  const duration = voice.duration
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const wave = buffer.getChannelData(0)
  for (let i = 0; i < wave.length; i++) wave[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = voice.filter
  filter.frequency.setValueAtTime(voice.from, start)
  filter.frequency.exponentialRampToValueAtTime(voice.to, start + duration)
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(voice.level * Math.max(0.01, Math.min(1, strength)), start + 0.006)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  noise.connect(filter).connect(envelope).connect(ctx.destination)
  const body = ctx.createOscillator()
  body.type = event === 'grapple' ? 'triangle' : 'sine'
  body.frequency.setValueAtTime(voice.pitch, start)
  body.frequency.exponentialRampToValueAtTime(voice.tail, start + duration)
  body.connect(envelope)
  noise.start(start)
  body.start(start)
  body.stop(start + duration)
  body.onended = () => {
    body.disconnect()
    noise.disconnect()
    filter.disconnect()
    envelope.disconnect()
  }
}
