import Phaser from 'phaser'
import { localPoint, type Vessel } from '../battle-model'
import {
  buildAirframe,
  buildGangway,
  buildHand,
  FLOATS_PER_VERTEX,
  GANGWAY_LENGTH,
  type Livery,
} from './airframes'

type CameraMatrix = Phaser.GameObjects.Components.TransformMatrix
type Renderer = Phaser.Renderer.WebGL.WebGLRenderer
export interface BoardingHand {
  x: number
  y: number
  rotation: number
}
export interface FleetPose {
  time: number
  player: Vessel
  foe: Vessel
  boardSeconds: number
  hands: BoardingHand[]
  weather: number
}

const vertex = `
precision highp float;
attribute vec3 position, normal, tint, pivot;
attribute vec2 uv, finish;
uniform vec4 vessel;       // chart x, chart y, compass heading, heel
uniform vec4 pose;         // time, rotor rate, sail reef, deck elevation
uniform vec4 recoil;
uniform float spanScale;
uniform vec4 camera;
uniform vec4 viewport;     // camera translation followed by canvas dimensions
uniform mediump vec3 movement;     // gait, shadow pass, storm
varying mediump vec3 dye, face;
varying mediump vec2 pattern;
varying mediump float material;
vec2 rotated(vec2 p, float a) { float s = sin(a), c = cos(a); return vec2(c*p.x-s*p.y,s*p.x+c*p.y); }
void main() {
  vec3 p=position, n=normal;
  float m=finish.y;
  if (m>0.5 && m<1.5) {
    float angle = pose.x*pose.y*sign(pivot.z);
    p.xz=pivot.xz+rotated(p.xz-pivot.xz,angle);
    n.xz=rotated(n.xz,angle);
  } else if(m>1.5 && m<2.5) {
    float span=abs(p.z-pivot.z);
    float wave=sin(p.x*0.17 + pose.x*3.4 + sign(p.z))*(0.035+0.026*movement.z);
    p.y += span*wave;
    p.z = pivot.z+(p.z-pivot.z)*(1.0-0.90*pose.z);
    p.y = pivot.y+(p.y-pivot.y)*(1.0-0.75*pose.z);
    n.yz=rotated(n.yz,wave);
  } else if(m>=3.0 && m<=6.0) {
    float kick=m<3.5?recoil.x:m<4.5?recoil.y:m<5.5?recoil.z:recoil.w;
    p.z-=sign(pivot.z)*kick*2.1;
  } else if(m>=7.0) {
    float arm=step(8.5,m), flip=mod(m,2.0)*2.0-1.0;
    float swing=(0.45+arm*.35)*sin(movement.x)*flip*(arm*2.0-1.0);
    p.xy=pivot.xy+rotated(p.xy-pivot.xy,swing);
    n.xy=rotated(n.xy,swing);
  }
  p.x*=spanScale;
  p.yz=rotated(p.yz,vessel.w);
  n.yz=rotated(n.yz,vessel.w);
  p.xz=rotated(p.xz,vessel.z)+vessel.xy;
  n.xz=rotated(n.xz,vessel.z);
  p.y+=pose.w;
  vec2 screen=p.xz-vec2(0.0,p.y*0.54);
  float depth=-(p.y+p.z*.54)/8192.0;
  if(movement.y>0.5) {
    screen=p.xz+vec2(3.0 + max(0.0,p.y)*.19,6.0 + max(0.0,p.y)*.10);
    depth=.965;
  }
  vec2 px=vec2(dot(camera.xz,screen),dot(camera.yw,screen))+viewport.xy;
  gl_Position=vec4(px.x/viewport.z*2.-1.,1.-px.y/viewport.w*2.,depth,1.);
  dye=tint; face=n; pattern=uv; material=finish.x;
}
`

const fragment = `
precision mediump float;
uniform sampler2D woodMap, metalMap, sailsMap;
uniform mediump vec3 movement;
varying mediump vec3 dye,face;
varying mediump vec2 pattern;
varying mediump float material;
void main() {
  if (movement.y>.5) { gl_FragColor=vec4(.038,.078,.092,.26); return; }
  vec3 n=normalize(face), eye=normalize(vec3(0.,1.,.54));
  if(dot(n,eye)<0.) n=-n;
  vec3 sun=normalize(vec3(-.49,.80,-.36)), halfRay=normalize(sun+eye);
  vec3 base=dye;
  float shine=.07, exponent=12.;
  if(material<.5) {
    vec3 grain=texture2D(woodMap,fract(pattern*.96+.02)).rgb;
    base*=.71+.55*dot(grain,vec3(.3,.58,.12));
  } else if(material<1.5) {
    vec3 patina=texture2D(metalMap,fract(pattern*.96+.02)).rgb;
    base*=.76+.39*dot(patina,vec3(.3,.58,.12));
    shine=.54; exponent=21.;
  } else if(material>=2.5 && material<6.5) {
    float swatch=material-3.;
    vec2 at=vec2(mod(swatch,2.),floor(swatch/2.));
    vec2 tex=(at+clamp(pattern,vec2(.018),vec2(.982)))*.5;
    base=texture2D(sailsMap,tex).rgb;
    shine=.16; exponent=8.;
  } else if(material>6.5) {
    gl_FragColor=vec4(min(vec3(1.),dye*1.14),1.);return;
  }
  float key=max(dot(n,sun),0.);
  float glow=pow(max(dot(n,halfRay),0.),exponent)*shine;
  vec3 ambient=mix(vec3(.52,.57,.61),vec3(.60,.67,.70),n.y*.5+.5);
  vec3 light=ambient+key*mix(vec3(.62,.51,.39),vec3(.37,.39,.46),movement.z);
  float rim=pow(1.-max(dot(n,eye),0.),3.)*.10;
  gl_FragColor=vec4(min(vec3(1.),base*light+vec3(1.,.88,.65)*glow+rim*vec3(.53,.73,.78)),1.);
}
`

const samplerKeys = ['fleet-wood', 'fleet-metal', 'fleet-cloth']
export const FLEET_TEXTURES = [
  ['fleet-wood', 'voxel-wood'],
  ['fleet-metal', 'voxel-patina'],
  ['fleet-cloth', 'fleet-sailcloth'],
] as const
interface BufferRange {
  offset: number
  count: number
}
interface FleetProgram {
  program: WebGLProgram
  buffer: WebGLBuffer
  ranges: BufferRange[]
  attributes: number[]
  uniform: Record<string, WebGLUniformLocation | null>
}
function createProgram(gl: WebGLRenderingContext, geometry: Float32Array[]): FleetProgram | null {
  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null,
    buffer: WebGLBuffer | null = null
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw Error('Shader unavailable')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader) ?? 'Fleet shader')
    }
    program = gl.createProgram()
    if (!program) throw Error('Program unavailable')
    for (const shader of shaders) gl.attachShader(program, shader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) ?? 'Fleet program')
    buffer = gl.createBuffer()
    if (!buffer) throw Error('Buffer unavailable')
    const data = new Float32Array(geometry.reduce((total, g) => total + g.length, 0))
    let offset = 0
    const ranges = geometry.map((g) => {
      data.set(g, offset)
      const range = { offset: offset / FLOATS_PER_VERTEX, count: g.length / FLOATS_PER_VERTEX }
      offset += g.length
      return range
    })
    const original = gl.getParameter(gl.ARRAY_BUFFER_BINDING)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, original)
    const attributes = ['position', 'normal', 'tint', 'uv', 'finish', 'pivot'].map((name) =>
      gl.getAttribLocation(program!, name),
    )
    const uniform = Object.fromEntries(
      [
        'vessel',
        'pose',
        'recoil',
        'spanScale',
        'camera',
        'viewport',
        'movement',
        'woodMap',
        'metalMap',
        'sailsMap',
      ].map((name) => [name, gl.getUniformLocation(program!, name)]),
    )
    return { program, buffer, attributes, uniform, ranges }
  } catch (error) {
    console.warn('Using the illustrated airships.', error)
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    return null
  } finally {
    for (const shader of shaders) gl.deleteShader(shader)
  }
}

/** Phaser flushes and restores its draw pipeline around an Extern. Its own camera
 * matrix keeps the mesh decks, shot origins, camera shake and grapples registered. */
export class VoxelFleet {
  private gpu: FleetProgram | null = null
  private extern: Phaser.GameObjects.Extern
  private readonly geometry: Float32Array[]
  private pose: FleetPose
  private gl: WebGLRenderingContext
  private renderer: Renderer
  constructor(
    private scene: Phaser.Scene,
    pose: FleetPose,
    opponent: Livery,
    private onAvailable: (ready: boolean) => void,
  ) {
    this.pose = pose
    this.renderer = scene.game.renderer as Renderer
    this.gl = this.renderer.gl
    this.geometry = [
      buildAirframe('wayfarer', pose.player.guns),
      buildAirframe(opponent, pose.foe.guns),
      buildHand(false),
      buildHand(true),
      buildGangway(),
    ]
    this.extern = scene.add.extern().setDepth(5)
    // Phaser's Extern runtime passes these arguments; its public method has no TS signature.
    Object.assign(this.extern, {
      render: (renderer: Renderer, _cam: unknown, matrix: CameraMatrix) => this.draw(renderer, matrix),
    })
    this.restore()
    this.renderer.on('restorewebgl', this.restore, this)
  }
  static supported(scene: Phaser.Scene) {
    if (scene.game.renderer.type !== Phaser.WEBGL || !samplerKeys.every((k) => scene.textures.exists(k)))
      return false
    const gl = (scene.game.renderer as Renderer).gl
    return !!gl.getContextAttributes()?.depth && gl.getParameter(gl.DEPTH_BITS) > 0
  }
  private restore() {
    this.gpu = createProgram(this.gl, this.geometry)
    this.extern.setVisible(!!this.gpu)
    this.onAvailable(!!this.gpu)
  }
  setPose(pose: FleetPose) {
    this.pose = pose
  }
  destroy() {
    this.renderer.off('restorewebgl', this.restore, this)
    this.extern.destroy()
    if (this.gpu) {
      this.gl.deleteProgram(this.gpu.program)
      this.gl.deleteBuffer(this.gpu.buffer)
      this.gpu = null
    }
  }
  private draw(renderer: Renderer, m: CameraMatrix) {
    const gpu = this.gpu
    if (!gpu) return
    const gl = this.gl,
      u = gpu.uniform,
      f = this.pose
    gl.useProgram(gpu.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.buffer)
    let offset = 0
    for (const [i, size] of [3, 3, 3, 2, 2, 3].entries()) {
      const slot = gpu.attributes[i]
      gl.enableVertexAttribArray(slot)
      gl.vertexAttribPointer(slot, size, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, offset * 4)
      offset += size
    }
    samplerKeys.forEach((key, i) => {
      const t = this.scene.textures.get(key).source[0].glTexture
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, t?.webGLTexture ?? null)
    })
    gl.uniform1i(u.woodMap, 0)
    gl.uniform1i(u.metalMap, 1)
    gl.uniform1i(u.sailsMap, 2)
    gl.uniform4f(u.camera, m.a, m.b, m.c, m.d)
    gl.uniform4f(u.viewport, m.e, m.f, renderer.width, renderer.height)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.depthFunc(gl.LESS)
    gl.clearDepth(1)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1f(u.spanScale, 1)
    for (const shadow of [1, 0]) {
      gl.uniform3f(u.movement, 0, shadow, f.weather)
      for (const [index, ship] of [f.player, f.foe].entries()) {
        const phase = f.time + index * 1.7
        const float = Math.sin(phase * 2.1) * 0.85
        const heel = ship.heel * 0.21 + Math.sin(phase * 1.6) * 0.028
        gl.uniform4f(u.vessel, ship.x, ship.y, ship.heading, heel)
        gl.uniform4f(u.pose, phase, 8 + ship.throttle * 3, Math.min(0.87, f.boardSeconds * 0.82), float)
        const kick = [0, 0, 0, 0]
        for (const gun of ship.guns) {
          const k = gun.station * 2 + (gun.side === 'port' ? 0 : 1)
          kick[k] = Math.max(0, 1 - (gun.reload - gun.cooldown) * 4.5)
        }
        gl.uniform4f(u.recoil, kick[0], kick[1], kick[2], kick[3])
        const range = gpu.ranges[index]
        gl.drawArrays(gl.TRIANGLES, range.offset, range.count)
      }
    }
    if (f.boardSeconds > 0.5) {
      const side =
        Math.sign(
          (f.foe.x - f.player.x) * -Math.sin(f.player.heading) +
            (f.foe.y - f.player.y) * Math.cos(f.player.heading),
        ) || 1
      const deployed = Math.min(1, (f.boardSeconds - 0.5) / 0.45)
      const range = gpu.ranges[4]
      gl.uniform4f(u.pose, 0, 0, 0, 1.55)
      for (const station of [-17, 14]) {
        const a = localPoint(f.player, station, side * 10),
          b = localPoint(f.foe, station, -side * 10)
        const dx = b.x - a.x,
          dy = b.y - a.y
        gl.uniform1f(u.spanScale, (Math.hypot(dx, dy) * deployed) / GANGWAY_LENGTH)
        gl.uniform4f(u.vessel, a.x, a.y, Math.atan2(dy, dx), 0)
        gl.drawArrays(gl.TRIANGLES, range.offset, range.count)
      }
      gl.uniform1f(u.spanScale, 1)
    }
    for (const [index, hand] of f.hands.entries()) {
      const friendly = index < f.hands.length - 4
      const range = gpu.ranges[friendly ? 2 : 3],
        stride = f.time * (f.boardSeconds > 2.5 ? 10 : 8) + index * 1.9
      gl.uniform3f(u.movement, stride, 0, f.weather)
      gl.uniform4f(u.vessel, hand.x, hand.y, hand.rotation, 0)
      gl.uniform4f(u.pose, f.time, 0, 0, 1.3 + Math.abs(Math.sin(stride)) * 0.66)
      gl.drawArrays(gl.TRIANGLES, range.offset, range.count)
    }
    for (const slot of gpu.attributes) gl.disableVertexAttribArray(slot)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }
}
