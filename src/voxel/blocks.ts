import * as T from 'three'

export type Finish = 'plaster' | 'timber' | 'copper' | 'canvas' | 'leaf' | 'glass' | 'lamp' | 'iron' | 'water'
export type Paints = Record<Finish, T.MeshStandardMaterial>
export type V2 = [number, number]
export type V3 = [number, number, number]
export type Place = 'market' | 'authority' | 'local' | 'ship' | 'shipyard' | 'civic'

export function random(seed: number) {
  let n = seed >>> 0
  return () => {
    n = (Math.imul(1664525, n) + 1013904223) >>> 0
    return n / 4294967296
  }
}
export function pick<T>(items: T[], rand: () => number) {
  return items[Math.floor(rand() * items.length)]
}
const unit = new T.BoxGeometry(1, 1, 1)
export const palette = {
  brick: '#bb7355',
  oak: '#a17954',
  dark: '#513b32',
  cream: '#e5c9a0',
  tile: '#507e77',
  brass: '#d3a35b',
  iron: '#424c52',
  glass: '#83bcbd',
}

export function paints(): Paints {
  const make = (roughness: number, metalness = 0) => new T.MeshStandardMaterial({ roughness, metalness })
  const items: Paints = {
    plaster: make(0.9),
    timber: make(0.77),
    copper: make(0.37, 0.58),
    canvas: make(0.92),
    leaf: make(0.89),
    glass: make(0.15, 0.38),
    lamp: make(0.25),
    iron: make(0.55, 0.66),
    water: make(0.14, 0.37),
  }
  items.glass.transparent = true
  items.glass.opacity = 0.78
  items.glass.depthWrite = false
  items.lamp.emissive.set('#ffc17b')
  items.lamp.emissiveIntensity = 1.4
  items.water.color.set('#87ced1')
  return items
}
/** One instanced draw per surface finish, including individually tinted stones and roof tiles. */
export class Blocks {
  private batches = new Map<Finish, { matrix: T.Matrix4; color: T.Color }[]>()
  private transform = new T.Object3D()
  materials: Paints
  constructor(materials: Paints) {
    this.materials = materials
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    finish: Finish = 'plaster',
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    if (w <= 0 || h <= 0 || d <= 0) return
    this.transform.position.set(x, y, z)
    this.transform.scale.set(w, h, d)
    this.transform.rotation.set(rx, ry, rz)
    this.transform.updateMatrix()
    this.add(finish, this.transform.matrix.clone(), color)
  }
  beam(a: V3, b: V3, width: number, color: string, finish: Finish = 'timber', depth = width) {
    const from = new T.Vector3(...a),
      to = new T.Vector3(...b),
      delta = to.clone().sub(from)
    this.transform.position.copy(from).addScaledVector(delta, 0.5)
    this.transform.scale.set(width, delta.length(), depth)
    this.transform.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())
    this.transform.updateMatrix()
    this.add(finish, this.transform.matrix.clone(), color)
  }
  private add(finish: Finish, matrix: T.Matrix4, color: string) {
    const bucket = this.batches.get(finish) ?? []
    if (!this.batches.has(finish)) this.batches.set(finish, bucket)
    bucket.push({ matrix, color: new T.Color(color) })
  }
  finish(parent: T.Object3D, shadows = true) {
    for (const [finish, bucket] of this.batches) {
      const mesh = new T.InstancedMesh(unit, this.materials[finish], bucket.length)
      bucket.forEach((piece, i) => {
        mesh.setMatrixAt(i, piece.matrix)
        mesh.setColorAt(i, piece.color)
      })
      mesh.name = finish + ' voxel surfaces'
      mesh.castShadow = shadows && finish !== 'glass' && finish !== 'water' && finish !== 'lamp'
      mesh.receiveShadow = finish !== 'lamp'
      mesh.computeBoundingSphere()
      parent.add(mesh)
    }
    this.batches.clear()
  }
}
export function artTexture(url: string, srgb = true) {
  const texture = new T.TextureLoader().load(import.meta.env.BASE_URL + 'art/' + url)
  if (srgb) texture.colorSpace = T.SRGBColorSpace
  texture.magFilter = T.NearestFilter
  texture.minFilter = T.LinearMipmapLinearFilter
  return texture
}

/** Sample pigment from the original material studies in world units, independent of voxel size. */
export function dressMaterials(materials: Paints, textures: T.Texture[]) {
  for (const [key, tile] of Object.entries({
    plaster: 'stone',
    timber: 'wood',
    copper: 'patina',
    canvas: 'linen',
  })) {
    const mat = materials[key as Finish]
    const texture = artTexture('voxel-' + tile + '.webp', false)
    texture.wrapS = texture.wrapT = T.RepeatWrapping
    textures.push(texture)
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.pigment = { value: texture }
      shader.vertexShader = 'varying vec3 blockPosition; varying vec3 blockNormal;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        #ifdef USE_INSTANCING
          blockPosition=(instanceMatrix*vec4(transformed,1.)).xyz;
          blockNormal=normalize(mat3(instanceMatrix)*normal);
        #else
          blockPosition=transformed;
          blockNormal=normal;
        #endif
      `,
      )
      shader.fragmentShader =
        'uniform sampler2D pigment; varying vec3 blockPosition; varying vec3 blockNormal;\n' +
        shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 n=abs(normalize(blockNormal));
        vec2 st=n.y>max(n.x,n.z)?blockPosition.xz:n.x>n.z?blockPosition.zy:blockPosition.xy;
        float ink=texture2D(pigment,st*.68).r;
        diffuseColor.rgb*=vec3(.78+.42*ink);
      `,
      )
    }
    mat.customProgramCacheKey = () => 'voxel-pigment-v1'
  }
}
export function disposeMeshes(scene: T.Object3D, materials: Paints, tex: T.Texture[]) {
  const geometry = new Set<T.BufferGeometry>(),
    other = new Set<T.Material>()
  scene.traverse((o) => {
    if (o instanceof T.Mesh) {
      if (o.geometry !== unit) geometry.add(o.geometry)
      if (o instanceof T.InstancedMesh) o.dispose()
      if (o instanceof T.SkinnedMesh) o.skeleton.dispose()
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) other.add(m)
    }
  })
  geometry.forEach((g) => g.dispose())
  Object.values(materials).forEach((m) => other.add(m))
  other.forEach((m) => m.dispose())
  tex.forEach((t) => t.dispose())
}
