import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './study.css'

const stage = document.querySelector<HTMLElement>('#stage')!
const canvas = stage.querySelector('canvas')!
const painting = stage.querySelector<HTMLImageElement>('.source')!
const status = document.querySelector<HTMLElement>('.status')!
const spec = document.querySelector<HTMLElement>('.spec')!
const hint = document.querySelector<HTMLElement>('.input-hint')!
const spin = document.querySelector<HTMLButtonElement>('#spin')!
const reset = document.querySelector<HTMLButtonElement>('#reset')!
const compare = document.querySelector<HTMLButtonElement>('#compare')!
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

async function readLattice(width: number) {
  const url = new URL('study/wayfarer-' + width + '.vox.gz', document.baseURI)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Ship data unavailable')
  let bytes = await res.arrayBuffer()
  if (new Uint8Array(bytes)[0] === 0x1f)
    bytes = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer()
  const data = new DataView(bytes)
  if (data.getUint32(0) !== 0x534b5631) throw new Error('Unknown ship format')
  const dims = new THREE.Vector3(data.getUint32(4, true), data.getUint32(8, true), data.getUint32(12, true))
  const faces = data.getUint32(16, true)
  if (bytes.byteLength !== 24 + faces * 10 || dims.x !== width) throw new Error('Incomplete ship')
  const geo = new THREE.InstancedBufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3),
  )
  geo.setIndex([0, 1, 2, 0, 2, 3])
  const packed = new THREE.InstancedInterleavedBuffer(new Uint16Array(bytes, 24), 5, 1)
  geo.setAttribute('cell', new THREE.InterleavedBufferAttribute(packed, 3, 0))
  geo.setAttribute('pigment', new THREE.InterleavedBufferAttribute(packed, 2, 3))
  geo.instanceCount = faces
  // The six orientations are grouped in the bake; shared edges sit on the same
  // integer lattice even when the camera is close enough to see individual cubes.
  const mat = new THREE.ShaderMaterial({
    uniforms: { dims: { value: dims } },
    vertexShader: `
      attribute vec3 cell;
      attribute vec2 pigment;
      uniform vec3 dims;
      varying vec3 ink, eye, surface;
      void main() {
        float side = floor(pigment.y / 256.0);
        vec3 n, u, v;
        if (side < 2.0) {
          float s = side < .5 ? 1.0 : -1.0;
          n=vec3(s,0,0); u=vec3(0,0,-s); v=vec3(0,1,0);
        } else if (side < 4.0) {
          float s = side < 2.5 ? 1.0 : -1.0;
          n=vec3(0,s,0); u=vec3(1,0,0); v=vec3(0,0,-s);
        } else {
          float s = side < 4.5 ? 1.0 : -1.0;
          n=vec3(0,0,s); u=vec3(s,0,0); v=vec3(0,1,0);
        }
        vec3 p=(cell+0.5+u*position.x+v*position.y+0.5*n-0.5*dims)*(12.0/dims.x);
        ink=vec3(mod(pigment.x,256.0),floor(pigment.x/256.0),mod(pigment.y,256.0))/255.0;
        surface=n;
        eye=cameraPosition-p;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `
      varying vec3 ink, eye, surface;
      void main(){
        vec3 key=normalize(vec3(-.4,.82,.62));
        float light=.87 + .18*max(0.0,dot(surface,key)) + .035*max(0.0,-surface.z);
        float metal=smoothstep(.10,.40,ink.r-ink.b)*smoothstep(.40,.85,ink.r);
        float gloss=pow(max(0.,dot(surface,normalize(normalize(eye)+key))),18.);
        gl_FragColor=vec4(ink*light + metal*gloss*vec3(.045,.033,.012),1.);
      }`,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  return { mesh, cells: data.getUint32(20, true), width }
}

async function openStudy() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-7, 7, 4, -4, 0.04, 150)
  const orbit = new OrbitControls(camera, canvas)
  orbit.minZoom = 0.48
  orbit.maxZoom = 16
  orbit.enableDamping = !reduced.matches
  orbit.dampingFactor = 0.11
  orbit.rotateSpeed = 0.75
  orbit.zoomToCursor = true
  orbit.autoRotateSpeed = 0.65
  let sourceShown = false,
    dirty = true,
    moving = false,
    frame = 0,
    previous = 0
  let current: Awaited<ReturnType<typeof readLattice>> | undefined
  const right = new THREE.Vector3(),
    up = new THREE.Vector3()
  function fitProjection() {
    // Fit the rotated bounding box at unit zoom; even the keel fits when a
    // broadside turns end-on. The captain's own zoom and pan are independent.
    camera.updateMatrixWorld()
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    const extent = (v: THREE.Vector3) => 6 * Math.abs(v.x) + 2 * Math.abs(v.y) + 1.14 * Math.abs(v.z)
    const aspect = stage.clientWidth / Math.max(1, stage.clientHeight)
    const half = Math.max(2.45, extent(up) * 1.26, (extent(right) * 1.13) / aspect)
    camera.left = -half * aspect
    camera.right = half * aspect
    camera.top = half
    camera.bottom = -half
    camera.updateProjectionMatrix()
  }
  function draw(time: number) {
    frame = 0
    if (document.hidden || sourceShown) return
    const dt = Math.min(0.05, (time - previous) / 1000 || 0)
    previous = time
    const changed = orbit.update(dt)
    if (dirty || changed || moving || orbit.autoRotate) {
      fitProjection()
      renderer.render(scene, camera)
    }
    dirty = false
    if (changed || moving || orbit.autoRotate) schedule()
  }
  function schedule() {
    if (!frame && !document.hidden && !sourceShown) frame = requestAnimationFrame(draw)
  }
  function invalidate() {
    dirty = true
    schedule()
  }
  function home() {
    orbit.autoRotate = false
    spin.setAttribute('aria-pressed', 'false')
    orbit.reset()
    orbit.target.set(0, -0.05, 0)
    camera.zoom = 1
    const view =
      stage.clientWidth < stage.clientHeight
        ? new THREE.Vector3(1.12, 0.76, 0.82)
        : new THREE.Vector3(0.38, 0.34, 1)
    camera.position.copy(view.normalize().multiplyScalar(23)).add(orbit.target)
    orbit.update()
    invalidate()
  }
  function size() {
    fitProjection()
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7))
    renderer.setSize(stage.clientWidth, stage.clientHeight, false)

    invalidate()
  }
  new ResizeObserver(size).observe(stage)
  size()
  home()
  orbit.addEventListener('change', invalidate)
  orbit.addEventListener('start', () => {
    moving = true
    orbit.autoRotate = false
    spin.setAttribute('aria-pressed', 'false')
    schedule()
  })
  orbit.addEventListener('end', () => {
    moving = false
    schedule()
  })
  document.addEventListener('visibilitychange', invalidate)
  reset.onclick = home
  spin.onclick = () => {
    orbit.autoRotate = !orbit.autoRotate
    spin.setAttribute('aria-pressed', String(orbit.autoRotate))
    invalidate()
  }
  compare.onclick = () => {
    sourceShown = !sourceShown
    painting.hidden = !sourceShown
    canvas.hidden = sourceShown
    spin.disabled = reset.disabled = sourceShown
    compare.textContent = sourceShown ? 'Show model' : 'Painting'
    compare.setAttribute('aria-pressed', String(sourceShown))
    hint.textContent = sourceShown ? 'Original ImageGen elevation' : 'Drag to orbit · Scroll or pinch to zoom'
    invalidate()
  }
  canvas.addEventListener('keydown', (e) => {
    const offset = camera.position.clone().sub(orbit.target)
    const s = new THREE.Spherical().setFromVector3(offset)
    switch (e.key) {
      case 'ArrowLeft':
        s.theta -= 0.14
        break
      case 'ArrowRight':
        s.theta += 0.14
        break
      case 'ArrowUp':
        s.phi -= 0.12
        break
      case 'ArrowDown':
        s.phi += 0.12
        break
      case '+':
      case '=':
        camera.zoom = Math.min(orbit.maxZoom, camera.zoom / 0.82)
        break
      case '-':
        camera.zoom = Math.max(orbit.minZoom, camera.zoom * 0.82)
        break
      case 'Home':
        e.preventDefault()
        home()
        return
      default:
        return
    }
    e.preventDefault()
    s.makeSafe()
    camera.position.setFromSpherical(s).add(orbit.target)
    orbit.update()
    invalidate()
  })
  async function install(width: number) {
    const next = await readLattice(width)
    if (current) {
      scene.remove(current.mesh)
      current.mesh.geometry.dispose()
      current.mesh.material.dispose()
    }
    current = next
    scene.add(next.mesh)
    spec.textContent = width.toLocaleString('en-US') + ' voxels from stern to bowsprit'
    canvas.dataset.voxelWidth = String(width)
    canvas.dataset.occupied = String(next.cells)
    status.hidden = true
    invalidate()
  }
  await install(576)
  try {
    await install(1536)
  } catch {
    status.textContent = 'The fine-detail download was interrupted.'
    status.hidden = false
  }
}
openStudy().catch(() => {
  canvas.hidden = true
  painting.hidden = false
  status.textContent = 'The interactive model needs WebGL 2 and its model files. Showing the painted elevation.'
  spec.textContent = ''
  hint.textContent = ''
  document.querySelector<HTMLElement>('.tools')!.hidden = true
})
