import type { PortId } from './model'
import { depthMask } from './illustrated-harbor-depth'
import './illustrated-harbor.css'

const VERTEX = `
attribute vec2 vertex;
varying vec2 uv;
void main() {
  uv = vertex * vec2(.5, -.5) + .5;
  gl_Position = vec4(vertex, 0., 1.);
}`

const FRAGMENT = `
precision highp float;
varying vec2 uv;
uniform sampler2D painting;
uniform sampler2D field;
uniform vec2 camera;
uniform vec2 texel;
uniform float seconds;
uniform float lanternStrength;
uniform vec2 beacon;

// Invert the depth relief in texture space. The artwork remains one continuous
// painting, even between rigging, windows, foliage and the sky behind them.
void main() {
  vec2 bound = smoothstep(vec2(0.), vec2(.016), min(uv, 1. - uv));
  vec2 shift = camera * bound;
  vec4 layer = texture2D(field, uv);
  vec2 source = uv - shift * layer.r;
  layer = texture2D(field, source);
  source = uv - shift * layer.r;
  // The masks restrict the wind to sailcloth and canvas market awnings.
  float cloth = sin(source.x * 96. - seconds * 1.8 + source.y * 12.);
  source.y += texel.y * layer.g * (.72 * cloth + .28 * sin(source.x * 57. - seconds));
  float sky = 1. - smoothstep(.036, .095, layer.r);
  source.x += texel.x * 1.65 * sky * sin(source.y * 9. + seconds * .13) * bound.x;
  // The painted schooner rocks slightly at its berth. Its mask shares a
  // texture channel with the physically separate lanterns along the quay.
  float berth = step(.518, source.x) * step(source.x, .807) * step(.18, source.y) * step(source.y, .66);
  float moored = layer.b * berth;
  source.y -= texel.y * moored * (1.45 * sin(seconds * .72) + (source.x - .665) * 9. * sin(seconds * .85));
  source.x += texel.x * moored * .65 * sin(seconds * .49);
  float cascade = sin(source.y * 510. - seconds * 5. + sin(source.x * 360.));
  source.y += 1.2 * texel.y * cascade * layer.a;
  vec3 color = texture2D(painting, source).rgb;
  color *= 1. + .052 * cascade * layer.a;
  // In the relit ports the moving beacon catches mist behind the skyline.
  float shaft = source.y - beacon.y - (source.x - beacon.x) * .025 * sin(seconds * .43);
  float sweep = exp(-abs(shaft) * 160.) * (1. - smoothstep(.01, .12, layer.r));
  color += vec3(1., .59, .2) * .065 * sweep * step(0., beacon.y);
  float light = .52 + .31 * sin(seconds * 1.6 + source.x * 74.) + .17 * sin(seconds * 4.3);
  color += layer.b * (1. - berth) * lanternStrength * light * vec3(1., .56, .21);
  color *= 1. + .009 * cloth * layer.g;
  gl_FragColor = vec4(color, 1.);
}`

export function mountHarborDepth(
  scene: HTMLElement,
  plate: HTMLElement,
  scroller: HTMLElement,
  port: PortId,
  night: boolean,
  anchors: ReadonlyArray<{ button: HTMLElement; x: number; y: number }>,
): () => void {
  const image = plate.querySelector<HTMLImageElement>('.quay-art')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const canvas = document.createElement('canvas')
  canvas.className = 'quay-depth'
  canvas.setAttribute('aria-hidden', 'true')
  image.after(canvas)
  let closed = false
  let stop: (() => void) | undefined

  // The source image is already visible and interactive during decoding, on a
  // lost graphics context, and on devices with motion reduction or no WebGL.
  function enable() {
    if (closed || stop || reduced.matches || !image.complete || !image.naturalWidth) return
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
    })
    if (!gl || gl.isContextLost()) return
    const vert = gl.createShader(gl.VERTEX_SHADER), frag = gl.createShader(gl.FRAGMENT_SHADER)
    const program = gl.createProgram()
    const geometry = gl.createBuffer(), art = gl.createTexture(), depths = gl.createTexture()
    function release() {
      gl!.deleteTexture(art)
      gl!.deleteTexture(depths)
      gl!.deleteBuffer(geometry)
      gl!.deleteProgram(program)
      gl!.deleteShader(vert)
      gl!.deleteShader(frag)
    }
    if (!vert || !frag || !program || !geometry || !art || !depths) {
      release()
      return
    }
    gl.shaderSource(vert, VERTEX)
    gl.compileShader(vert)
    gl.shaderSource(frag, FRAGMENT)
    gl.compileShader(frag)
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      release()
      return
    }
    const relief = depthMask(port)
    for (const { button, x, y } of anchors) {
      button.style.setProperty('--ink-depth', String(relief.depthAt(x, y)))
    }
    // The character's animated upper body shares the depth of the painted boots and cart.
    plate.style.setProperty('--figure-depth', String(242 / 255))
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const vertex = gl.getAttribLocation(program, 'vertex')
    gl.enableVertexAttribArray(vertex)
    gl.vertexAttribPointer(vertex, 2, gl.FLOAT, false, 0, 0)

    function texture(unit: number, data: WebGLTexture) {
      gl!.activeTexture(gl!.TEXTURE0 + unit)
      gl!.bindTexture(gl!.TEXTURE_2D, data)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    }
    texture(0, art)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    } catch {
      release()
      return
    }
    texture(1, depths)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, relief.width, relief.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, relief.field)
    if (gl.getError() !== gl.NO_ERROR) {
      release()
      return
    }
    gl.uniform1i(gl.getUniformLocation(program, 'painting'), 0)
    gl.uniform1i(gl.getUniformLocation(program, 'field'), 1)
    gl.uniform2f(gl.getUniformLocation(program, 'texel'), 1 / image.naturalWidth, 1 / image.naturalHeight)
    gl.uniform1f(gl.getUniformLocation(program, 'lanternStrength'), night ? .105 : port === 'copperfall' ? .075 : .03)
    gl.uniform2f(gl.getUniformLocation(program, 'beacon'), port === 'sunstep' ? .771 : .51, night ? (port === 'sunstep' ? .08 : .126) : -1)
    const camera = gl.getUniformLocation(program, 'camera')
    const time = gl.getUniformLocation(program, 'seconds')
    let width = 1, height = 1, pan = 0, panY = 0, pointerX = 0, pointerY = 0
    let x = 0, y = 0, frame = 0, last = -Infinity, elapsed = 0
    function updatePan() {
      const range = scroller.scrollWidth - scroller.clientWidth
      pan = range > 24 ? scroller.scrollLeft / range * 2 - 1 : 0
      const rangeY = scroller.scrollHeight - scroller.clientHeight
      panY = rangeY > 24 ? scroller.scrollTop / rangeY * 2 - 1 : 0
    }
    function layout() {
      width = Math.max(1, plate.offsetWidth)
      height = Math.max(1, plate.offsetHeight)
      const ratio = Math.min(devicePixelRatio, 2, 2304 / width, 1536 / height)
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      gl!.viewport(0, 0, canvas.width, canvas.height)
      updatePan()
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      const rect = scroller.getBoundingClientRect()
      pointerX = (event.clientX - rect.left) / rect.width * 2 - 1
      pointerY = (event.clientY - rect.top) / rect.height * 2 - 1
    }
    function center() {
      pointerX = 0
      pointerY = 0
    }
    function paint(now: number) {
      // A still background stays behind any reading panel.
      if (now - last >= 1000 / 30 - 1) {
        const delta = Math.min((now - last) / 1000, .1)
        elapsed += delta
        last = now
        const easing = 1 - Math.exp(-6 * delta)
        const targetX = Math.max(-1, Math.min(1, pointerX * .86 + pan * .68 + .12 * Math.sin(elapsed * .19)))
        const targetY = Math.max(-1, Math.min(1, pointerY * .84 + panY * .55 + .16 * Math.sin(elapsed * .23)))
        x += (targetX * Math.min(14, width * .009) - x) * easing
        y += (targetY * Math.min(8, height * .009) - y) * easing
        plate.style.setProperty('--quay-x', x.toFixed(2) + 'px')
        plate.style.setProperty('--quay-y', y.toFixed(2) + 'px')
        gl!.uniform2f(camera, x / width, y / height)
        gl!.uniform1f(time, elapsed)
        gl!.drawArrays(gl!.TRIANGLES, 0, 3)
        canvas.classList.add('ready')
      }
      frame = requestAnimationFrame(paint)
    }
    function activity() {
      cancelAnimationFrame(frame)
      if (!document.hidden && !scene.classList.contains('reading')) {
        last = -Infinity
        frame = requestAnimationFrame(paint)
      }
    }
    layout()
    const size = new ResizeObserver(layout)
    const reading = new MutationObserver(activity)
    size.observe(plate)
    reading.observe(scene, { attributes: true, attributeFilter: ['class'] })
    scene.addEventListener('pointermove', move, { passive: true })
    scene.addEventListener('pointerleave', center)
    scroller.addEventListener('scroll', updatePan, { passive: true })
    document.addEventListener('visibilitychange', activity)
    activity()
    stop = () => {
      stop = undefined
      size.disconnect()
      reading.disconnect()
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', activity)
      scene.removeEventListener('pointermove', move)
      scene.removeEventListener('pointerleave', center)
      scroller.removeEventListener('scroll', updatePan)
      plate.style.removeProperty('--quay-x')
      plate.style.removeProperty('--quay-y')
      canvas.classList.remove('ready')
      release()
    }
  }
  function lost(event: Event) {
    event.preventDefault()
    stop?.()
  }
  function preference() {
    if (reduced.matches) stop?.()
    else enable()
  }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', enable)
  image.addEventListener('load', enable)
  reduced.addEventListener('change', preference)
  enable()
  return () => {
    closed = true
    const rendered = Boolean(stop)
    stop?.()
    reduced.removeEventListener('change', preference)
    image.removeEventListener('load', enable)
    canvas.removeEventListener('webglcontextlost', lost)
    canvas.removeEventListener('webglcontextrestored', enable)
    if (rendered) canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext()
    canvas.remove()
  }
}
