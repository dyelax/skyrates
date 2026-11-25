import Phaser from 'phaser'

interface VesselMotion {
  x: number
  y: number
  vx: number
  vy: number
}

// Three optically distinct heights sample the painted cloud field. Mirror sampling
// keeps the wind continuous when a non-tileable feature drifts past a texture edge.
const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 outTexCoord;
uniform sampler2D iChannel0;
uniform float clockSeconds;
uniform float aspect;
uniform vec2 drift;
uniform vec2 wind;
uniform float storm;
uniform vec4 hullA;
uniform vec4 hullB;
vec2 mirrorUV(vec2 p) { return 1.0 - abs(mod(p, 2.0) - 1.0); }
vec3 clouds(vec2 p) { return texture2D(iChannel0, mirrorUV(p)).rgb; }
float luma(vec3 c) { return dot(c, vec3(.23,.63,.14)); }
// Propwash opens a narrow, tapering trough behind a moving hull.
float wake(vec2 p, vec4 ship) {
  vec2 v = ship.zw;
  float speed = length(v);
  vec2 dir = v / max(speed, .001);
  vec2 delta = p - ship.xy;
  float along = -dot(delta, dir);
  float crosswind = dot(delta, vec2(-dir.y,dir.x));
  float width = .019 + .17 * max(along, 0.0);
  return exp(-crosswind*crosswind/(width*width)) * smoothstep(.01,.045,along) *
         (1.0-smoothstep(.045,.34,along)) * smoothstep(.01,.17,speed);
}
void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0-outTexCoord.y);
  vec2 p = (uv - .5) * vec2(aspect,1.0);
  vec2 weather = wind * clockSeconds;
  float t = clockSeconds*.16;
  vec2 shear = vec2(sin(p.y*5.3+t)+.48*sin(p.x*6.0-t*.7),
                    cos(p.x*4.1-t*.66)+.34*sin(p.y*8.2+t*.4));
  vec2 deepUV = p * vec2(.46,.69) + vec2(.38,.56) - weather*.004 + drift*.08;
  vec3 deep = clouds(deepUV + .008*shear) * vec3(.72,.85,.94);
  vec2 bankUV = p * vec2(.68,.84) + vec2(.76,.27) - weather*.012 + drift*.18 + shear*.021;
  vec3 banks = clouds(bankUV);
  float body = smoothstep(.26,.71,luma(banks));
  vec3 base = mix(deep * (1.0-.19*body),banks,body*.86);
  vec2 nearUV = p * vec2(.39,.57) + vec2(.45,.73) - weather*.025 + drift*.32 + shear*.034;
  vec3 highCloud = clouds(nearUV);
  float density = luma(highCloud);
  float cleared = max(wake(p,hullA),wake(p,hullB));
  float crest = smoothstep(.53,.78,density+.026*sin(t+p.x*3.0)) * (1.0 - cleared*.91);
  float shadow = smoothstep(.52,.75,luma(clouds(nearUV+vec2(.010,-.019)))) * (1.0-cleared);
  vec3 sunlight = vec3(1.02,.99,.91);
  vec3 color = mix(base*(1.0-.19*shadow), highCloud*sunlight, crest*.86);
  color = mix(color,color*vec3(.69,.77,.95),storm*.61);
  gl_FragColor = vec4(color,1.0);
}`

export class CloudDeck {
  private bank?: Phaser.GameObjects.Shader
  private lower?: Phaser.GameObjects.Image
  private upper?: Phaser.GameObjects.Image
  private time = 0
  private scroll = { x: 0, y: 0 }
  private width = 1
  private height = 1
  private reduced = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(scene: Phaser.Scene, width: number, height: number) {
    if (scene.game.renderer.type === Phaser.WEBGL) {
      const uniforms = {
        clockSeconds: { type: '1f', value: 0 },
        aspect: { type: '1f', value: 1 },
        wind: { type: '2f', value: { x: 0.75, y: -0.28 } },
        storm: { type: '1f', value: 0 },
        drift: { type: '2f', value: { x: 0, y: 0 } },
        hullA: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
        hullB: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      }
      const shader = new Phaser.Display.BaseShader(
        'trade-wind-deck',
        fragment,
        undefined,
        uniforms,
      )
      this.bank = scene.add
        .shader(shader, 0, 0, 1, 1, ['sea'], { wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge', minFilter: 'linear', magFilter: 'linear' })
        .setOrigin(0)
        .setDepth(0)
    } else {
      this.lower = scene.add.image(0, 0, 'sea').setTint(0xc8e2ed).setDepth(0)
      this.upper = scene.add.image(0, 0, 'sea').setDepth(0.1).setAlpha(0.23)
    }
    this.resize(width, height)
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.bank
      ?.setScale(width, height)
      .setUniform('aspect.value', width / height)
    for (const [layer, zoom] of [
      [this.lower, 1.16],
      [this.upper, 1.53],
    ] as const) {
      if (layer)
        layer
          .setScale(Math.max(width / layer.width, height / layer.height) * zoom)
          .setPosition(width / 2, height / 2)
    }
  }

  update(
    dt: number,
    player: VesselMotion,
    other: VesselMotion,
    wind = { x: 0.75, y: -0.28 },
    storm = 0,
  ) {
    const motion = this.reduced.matches ? 0.12 : 1
    this.time += dt * motion
    this.scroll.x += (player.vx * dt * motion) / this.height
    this.scroll.y += (player.vy * dt * motion) / this.height
    if (this.bank) {
      const u = this.bank.uniforms
      u.clockSeconds.value = this.time
      u.drift.value.x = this.scroll.x
      u.drift.value.y = this.scroll.y
      u.wind.value.x = wind.x
      u.wind.value.y = wind.y
      u.storm.value = storm
      this.trackHull(u.hullA.value, player)
      this.trackHull(u.hullB.value, other)
    } else {
      const t = this.time
      this.lower?.setPosition(
        this.width * (0.5 + 0.035 * wind.x * Math.sin(t * 0.045)),
        this.height * (0.5 + 0.032 * wind.y * Math.sin(t * 0.045)),
      )
      this.upper
        ?.setPosition(
          this.width * (0.5 + 0.12 * wind.x * Math.sin(t * 0.11)),
          this.height * (0.5 + 0.09 * wind.y * Math.sin(t * 0.11)),
        )
        .setAlpha(0.24 + storm * 0.15 + 0.09 * Math.sin(t * 0.18))
    }
  }

  private trackHull(
    value: { x: number; y: number; z: number; w: number },
    ship: VesselMotion,
  ) {
    value.x = (ship.x - this.width * 0.5) / this.height
    value.y = ship.y / this.height - 0.5
    value.z = ship.vx / this.height
    value.w = ship.vy / this.height
  }
}
