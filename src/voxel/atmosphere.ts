import * as T from 'three'
import type { GameState } from '../model'
import { portWeather, type WeatherReport } from '../weather'
import type { Paints } from './blocks'

const seasons = {
  spring: { light: '#fff0c2', leaves: '#a6c16a', altitude: 1.08, pigment: 0.16 },
  summer: { light: '#ffe4ab', leaves: '#63964f', altitude: 1.4, pigment: 0.08 },
  autumn: { light: '#ffc481', leaves: '#bc773a', altitude: 0.8, pigment: 0.66 },
  winter: { light: '#cee4fa', leaves: '#a9b5a7', altitude: 0.67, pigment: 0.42 },
}
const skyColor = { clear: '#cfe6e6', haze: '#ddc7ab', rain: '#9daeb7', squall: '#717d91', frost: '#c7dcdf' }

/** Weather is drawn in world space, with the nearest drops passing the camera and distant drops fading into the fog. */
function precipitation(scene: T.Scene, report: WeatherReport, initialSeed: number) {
  const frost = report.kind === 'frost'
  if (
    (!frost && report.kind !== 'rain' && report.kind !== 'squall') ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const count = Math.round((frost ? 420 : 780) + report.severity * 950)
  const stride = frost ? 1 : 2
  const positions = new Float32Array(count * stride * 3),
    tails = new Float32Array(count * stride)
  let seed = initialSeed >>> 0
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < count; i++) {
    const x = random() * 38,
      y = random() * 14,
      z = random() * 38
    for (let end = 0; end < stride; end++) {
      const j = i * stride + end
      positions[j * 3] = x
      positions[j * 3 + 1] = y
      positions[j * 3 + 2] = z
      tails[j] = end
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
  geometry.setAttribute('tail', new T.BufferAttribute(tails, 1))
  const material = new T.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    uniforms: {
      elapsed: { value: 0 },
      fall: {
        value: new T.Vector3(
          report.wind.x * (frost ? 1.3 : 3.1),
          frost ? -0.85 : -9.8,
          report.wind.y * (frost ? 1.3 : 3.1),
        ),
      },
      ice: { value: Number(frost) },
      tint: { value: new T.Color(frost ? '#e0eff4' : '#d1e6f1') },
    },
    vertexShader: `
      uniform float elapsed,ice;
      uniform vec3 fall;
      attribute float tail;
      varying float opacity;
      void main(){
        vec3 p=position+elapsed*fall;
        p.x+=ice*.28*sin(elapsed*.83+position.y);
        p.xz=cameraPosition.xz+mod(p.xz-cameraPosition.xz+19.,38.)-19.;
        p.y=mod(p.y,14.);
        p-=fall*.048*tail;
        vec4 eye=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*eye;
        gl_PointSize=clamp(20./max(1.,-eye.z),1.,3.);
        opacity=(1.-smoothstep(10.,19.,length(p.xz-cameraPosition.xz)))*smoothstep(.08,2.5,-eye.z);
      }`,
    fragmentShader: `varying float opacity; uniform vec3 tint; uniform float ice; void main(){gl_FragColor=vec4(tint,opacity*(.31+.28*ice));
    #include <colorspace_fragment>
    }`,
  })
  const field = frost ? new T.Points(geometry, material) : new T.LineSegments(geometry, material)
  field.frustumCulled = false
  field.renderOrder = 3
  field.name = 'Local precipitation'
  scene.add(field)
  return {
    update(dt: number) {
      material.uniforms.elapsed.value += dt
    },
    dispose() {
      scene.remove(field)
      geometry.dispose()
      material.dispose()
    },
  }
}

export function seasonPort(
  state: GameState,
  scene: T.Scene,
  hemi: T.HemisphereLight,
  sun: T.DirectionalLight,
  materials: Paints,
) {
  const report = portWeather(state.port, state.day),
    season = seasons[report.season]
  const night = state.mission === 'lit' && (state.port === 'sunstep' || state.port === 'glasshouse')
  const cloudCover = { clear: 0, haze: 0.22, frost: 0.18, rain: 0.55, squall: 0.77 }[report.kind]
  const sky = new T.Color(skyColor[report.kind])
  sun.color.lerp(new T.Color(season.light), night ? 0.12 : 0.44)
  sun.color.lerp(sky, cloudCover * 0.68)
  sun.intensity *= 1 - cloudCover * 0.76
  if (!night) sun.position.y *= season.altitude
  hemi.color.lerp(sky, 0.17 + cloudCover * 0.48)
  scene.backgroundIntensity *= 1 - cloudCover * 0.62
  scene.environmentIntensity *= 1 - cloudCover * 0.47
  if (scene.fog instanceof T.FogExp2) {
    scene.fog.color.lerp(sky, night ? cloudCover * 0.3 : 0.16 + cloudCover * 0.62)
    scene.fog.density *= 1 + cloudCover * 1.8 + (report.kind === 'haze' ? 0.62 : 0)
  }
  if (report.kind === 'rain' || report.kind === 'squall') {
    materials.timber.roughness *= 0.55
    materials.copper.roughness *= 0.65
    materials.iron.roughness *= 0.65
    materials.timber.color.multiplyScalar(0.84)
  }
  // Atrium plantings are sheltered; the exposed orchards and crown gardens change more strongly.
  const leafTint = new T.Color(season.leaves)
  const mix = season.pigment * (state.port === 'glasshouse' ? 0.47 : 1)
  const color = new T.Color()
  scene.traverse((mesh) => {
    if (!(mesh instanceof T.InstancedMesh) || mesh.material !== materials.leaf || !mesh.instanceColor) return
    for (let i = 0; i < mesh.count; i++) {
      mesh.getColorAt(i, color)
      if (color.g > color.r * 0.72 && color.g > color.b * 1.08) {
        color.lerp(leafTint, Math.min(0.84, mix * (0.78 + ((i * 17) % 29) / 58)))
        mesh.setColorAt(i, color)
      }
    }
    mesh.instanceColor.needsUpdate = true
  })
  return precipitation(scene, report, state.day * 113 + state.port.charCodeAt(0) * 37)
}
