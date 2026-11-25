// A transparent WebGL layer lights the painted scenery. Interaction stays in scene coordinates.
const VERTEX = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * .5 + .5;
    gl_Position = vec4(position, 0., 1.);
  }
`
const FRAGMENT = `
  precision mediump float;
  varying vec2 uv;
  uniform float time;
  uniform vec3 tint;
  uniform vec2 glass;
  uniform float night;
  uniform float aspect;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(23.13, 51.71))) * 1374.57); }
  void main() {
    vec2 p = vec2(uv.x, 1. - uv.y);
    // Slow pools of light on glass and a few drifting seeds, visible chiefly against shade.
    vec2 pane = (p - glass) * vec2(aspect * 1.8, 1.2);
    float glow = exp(-dot(pane, pane) * 65.) * (.012 + .013 * sin(time * .55));
    vec2 drift = p * vec2(29. * aspect, 29.) + vec2(time * .16, time * .07);
    vec2 cell = floor(drift);
    float seed = hash(cell);
    vec2 center = vec2(.3 + .4 * seed, .48 + .18 * sin(time * .44 + seed * 20.));
    float distance = length(fract(drift) - center);
    float mote = (1. - smoothstep(.014, .05, distance)) * step(.92,seed) *
      smoothstep(.25,.64,p.y) * (.12 + .12 * sin(time + seed * 7.));
    float light = glow + mote + night * .016 * exp(-dot(pane,pane)*30.);
    gl_FragColor = vec4(tint, clamp(light, 0., .22));
  }
`

export function lightHarbor(canvas: HTMLCanvasElement, source: [number, number], night: boolean): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  })
  if (!gl) return () => {}
  function shader(type: number, code: string) {
    const stage = gl!.createShader(type)!
    gl!.shaderSource(stage, code)
    gl!.compileShader(stage)
    return stage
  }
  const vertex = shader(gl.VERTEX_SHADER, VERTEX),
    fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT)
  const program = gl.createProgram()!
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return () => {}
  }
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(gl.getUniformLocation(program, 'glass'), source[0] / 100, source[1] / 100)
  gl.uniform3f(gl.getUniformLocation(program, 'tint'), 1, night ? 0.81 : 0.89, night ? 0.56 : 0.66)
  gl.uniform1f(gl.getUniformLocation(program, 'night'), night ? 1 : 0)
  const time = gl.getUniformLocation(program, 'time')
  const aspect = gl.getUniformLocation(program, 'aspect')
  let frame = 0,
    last = -100
  const observer = new ResizeObserver(() => {
    const width = Math.min(1100, Math.max(1, canvas.clientWidth))
    canvas.width = width
    canvas.height = Math.max(1, Math.round((width * canvas.clientHeight) / Math.max(1, canvas.clientWidth)))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform1f(aspect, canvas.width / canvas.height)
  })
  observer.observe(canvas)
  function paint(t: number) {
    if (!document.hidden && t - last >= 44) {
      last = t
      gl!.uniform1f(time, (t % 1000000) / 1000)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }
    frame = requestAnimationFrame(paint)
  }
  frame = requestAnimationFrame(paint)
  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
