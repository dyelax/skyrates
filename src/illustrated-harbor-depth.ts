import type { PortId } from './model'

// Coordinates are percentages of the original 1672 × 941 ImageGen plates.
// The drawings are masks only. All visible color and surface detail come from the painting.
interface QuayLayers {
  skyline: string
  buildings: [landmark: string, schooner: string]
  stalls: string[]
  foreground: string[]
  fabric: string[]
  waterfalls: string[]
  lamps: [number, number, number][]
}

const layers: Record<PortId, QuayLayers> = {
  sunstep: {
    skyline: '0,19 5,18 12,25 22,22 29,26 44,19 51,15 58,12 70,3 84,0 100,0 100,62 0,62',
    buildings: [
      '21,61 21,47 23,44 23,29 26,26 29,21 32,20 33,15 37,16 40,15 40,11 42,8 44,10 44,15 48,20 50,23 53,27 50,30 51,55 53,58 53,65 23,66',
      '52,49 56,47 61,28 61,44 64,43 65,23 66,43 71,35 70,24 75,43 73,48 76,48 73,54 66,60 61,58 57,55',
    ],
    stalls: [
      '0,19 6,18 8,25 8,35 13,39 20,42 24,47 29,48 29,53 21,51 21,69 16,70 15,79 9,84 0,89',
      '77,20 86,20 95,2 100,0 100,73 87,72 79,69 80,36 82,27 78,26',
    ],
    foreground: [
      '0,0 36,0 34,3 31,5 29,9 24,7 22,11 19,7 16,10 14,7 11,10 10,8 6,14 2,16 0,22',
      '27,60 30,57 32,60 33,66 33,72 36,72 38,71 42,69 47,73 50,79 49,89 45,95 36,95 33,89 29,96 27,92 28,81 26,78',
      '64,100 67,91 72,85 75,84 78,80 81,81 90,78 95,73 100,69 100,100',
    ],
    fabric: ['0,34 10,40 20,43 21,47 18,49 13,47 6,44 0,43', '54,48 60,32 60,46', '66,42 70,29 72,41'],
    waterfalls: ['58.4,14.1 60.4,13.6 60.8,22.3 57.9,23.4','70.7,8.1 71.8,7.8 71.5,13.4 70.6,14.3'],
    lamps: [[40,46,1.2],[32,37,0.65],[45,36,0.8],[42,12,0.8]],
  },
  glasshouse: {
    skyline: '0,0 42,0 47,9 57,14 65,21 74,19 77,23 85,19 91,20 100,15 100,62 0,62',
    buildings: [
      '33,57 34,44 37,43 39,39 46,39 48,24 48,20 47,19 47,16 48,15 48,9 50,6 52,9 52,15 55,16 55,20 53,23 54,36 54,42 57,45 59,47 56,59 56,60 33,62',
      '59,46 63,42 69,28 69,41 72,39 73,20 74,39 77,31 77,26 78,42 79,45 77,50 76,53 69,57 63,54',
    ],
    stalls: [
      '0,8 7,10 14,12 19,17 23,21 26,29 28,39 27,61 21,67 14,64 11,72 10,78 0,82',
      '79,36 86,27 93,20 100,21 100,65 92,67 85,65 80,72',
    ],
    foreground: [
      '0,0 18,0 16,6 13,7 10,12 6,10 8,17 11,19 9,23 12,29 9,34 8,29 6,33 5,24 2,21 0,27',
      '19,61 23,59 26,60 27,66 30,65 31,68 36,67 38,70 38,87 40,84 41,91 37,97 32,95 26,99 19,98 19,89 18,84 18,72',
      '77,100 78,84 80,78 84,75 89,76 92,74 99,68 100,68 100,100',
    ],
    fabric: ['10,41 13,43 18,44 22,47 22,49 18,49 12,46','61,45 68,32 68,43','73,41 77,28 77,42'],
    waterfalls: ['34.7,8.2 36.6,8.6 37.6,17.1 35.6,16.3','34.8,30.8 36.4,31.8 37.9,39.4 35.6,40.3','65.5,18.2 66.4,18.2 66.7,24.8 65.7,24'],
    lamps: [[90,54,2.1],[50,17,1.0],[48,52,0.85],[14,38,0.8]],
  },
  copperfall: {
    skyline: '0,0 29,0 36,1 47,13 57,16 65,13 74,8 82,4 91,3 100,0 100,62 0,62',
    buildings: [
      '18,59 18,42 20,38 22,37 23,29 26,27 27,22 29,23 30,28 33,25 34,17 35,15 36,21 39,23 42,21 46,24 50,29 52,29 52,34 55,35 57,41 57,58 56,62 50,65 31,64',
      '57,52 60,46 60,32 64,46 65,21 66,27 67,45 70,48 69,27 74,49 76,50 73,54 69,58 65,61 60,59',
    ],
    stalls: [
      '0,10 4,10 5,25 9,31 14,34 19,37 23,41 24,49 21,50 20,66 15,73 15,77 8,83 0,89',
      '73,24 78,25 85,8 91,0 100,0 100,73 92,74 79,66 79,35 74,31',
    ],
    foreground: [
      '0,0 16,0 15,4 12,5 10,10 7,7 5,13 2,14 0,19',
      '0,69 4,68 7,72 9,79 13,78 15,83 14,92 11,95 0,100',
      '18,77 22,73 24,71 24,64 24,58 26,55 28,55 30,59 32,66 31,76 33,83 30,87 29,95 26,96 25,92 20,92 17,87',
      '83,86 88,83 100,78 100,98 90,94 83,92',
    ],
    fabric: ['0,32 10,37 18,42 24,46 24,50 21,49 17,49 10,46 0,41','60,49 61,35 64,48','66,46 66,25 69,47'],
    waterfalls: ['30,8.1 31.9,8.9 32.9,16.8 30.4,15.8','17.1,21.6 19.3,23.1 20,29.2 17.5,28.7','15.8,34.5 17.1,34.4 18.2,41 16,39.3'],
    lamps: [[94,64,1.7],[45,39,0.9],[17,55,0.55],[7,54,0.55]],
  },
  meridian: {
    skyline: '0,8 7,12 14,10 22,6 27,4 30,0 32,12 41,12 43,15 53,13 60,18 72,8 79,5 82,9 93,3 100,2 100,61 0,61',
    buildings: [
      '26,58 26,43 29,40 31,36 31,30 32,24 35,18 39,15 40,12 41,9 42,14 45,16 48,21 49,26 50,33 50,14 51,16 52,20 53,15 55,19 56,14 57,17 56,22 55,25 56,49 58,54 56,63 29,65',
      '56,49 61,43 63,32 63,44 68,34 69,20 70,25 70,40 77,26 77,22 78,43 80,46 78,54 71,57 65,63 60,58',
    ],
    stalls: [
      '0,17 5,18 9,25 9,30 16,37 18,37 19,44 22,46 23,45 24,47 22,65 15,74 6,76 0,78',
      '80,10 82,11 90,18 92,13 96,4 100,0 100,79 91,75 86,71 80,76 79,52 81,43 80,40 83,38 83,28',
    ],
    foreground: [
      '0,72 5,63 8,61 10,66 10,70 14,68 17,63 19,62 21,67 21,76 24,72 24,64 24,58 26,55 29,55 31,57 31,63 31,72 33,82 37,79 40,76 44,74 45,71 47,71 47,76 45,82 43,95 40,100 0,100',
      '88,100 90,91 94,86 97,81 100,79 100,100',
    ],
    fabric: ['1,31 6,36 15,39 15,42 10,42 4,39','59,48 63,36 63,45','70,42 77,27 77,42'],
    waterfalls: ['15.8,28.4 16.6,28 16.8,36.5 15.3,38.7','17.9,29.2 18.6,28.4 18.7,34.7 17.8,36.2'],
    lamps: [[47,51,1.1],[82,48,0.5],[35,52,0.7],[92,61,1.1]],
  },
}

const WIDTH = 512, HEIGHT = 288

export function depthMask(port: PortId) {
  const location = layers[port]
  function drawing() {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.scale(WIDTH / 100, HEIGHT / 100)
    return ctx
  }
  function silhouette(ctx: CanvasRenderingContext2D, outline: string, tone: number) {
    ctx.beginPath()
    outline.split(' ').forEach((vertex, index) => {
      const [x, y] = vertex.split(',').map(Number)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = `rgb(${tone} ${tone} ${tone})`
    ctx.fill()
  }
  const depth = drawing(), cloth = drawing(), lamps = drawing(), falls = drawing()
  depth.fillStyle = 'rgb(8 8 8)'
  depth.fillRect(0, 0, 100, 100)
  depth.filter = 'blur(1.2px)'
  silhouette(depth, location.skyline, 28)
  const paving = depth.createLinearGradient(0, 52, 0, 100)
  paving.addColorStop(0, 'rgb(44 44 44)')
  paving.addColorStop(0.3, 'rgb(98 98 98)')
  paving.addColorStop(1, 'rgb(239 239 239)')
  depth.fillStyle = paving
  depth.fillRect(0, 52, 100, 50)
  for (const shape of location.buildings) silhouette(depth, shape, 93)
  for (const shape of location.stalls) silhouette(depth, shape, 155)
  for (const shape of location.foreground) silhouette(depth, shape, 242)
  cloth.filter = 'blur(1.5px)'
  for (const shape of location.fabric) silhouette(cloth, shape, 255)
  falls.filter = 'blur(1.2px)'
  for (const shape of location.waterfalls) silhouette(falls, shape, 255)
  for (const [x, y, radius] of location.lamps) {
    lamps.save()
    lamps.translate(x, y)
    lamps.scale(1, WIDTH / HEIGHT)
    const light = lamps.createRadialGradient(0, 0, 0, 0, 0, radius)
    light.addColorStop(0, 'white')
    light.addColorStop(1, 'transparent')
    lamps.fillStyle = light
    lamps.fillRect(-radius, -radius, radius * 2, radius * 2)
    lamps.restore()
  }
  const field = depth.getImageData(0, 0, WIDTH, HEIGHT).data
  const fabric = cloth.getImageData(0, 0, WIDTH, HEIGHT).data
  const light = lamps.getImageData(0, 0, WIDTH, HEIGHT).data
  const vessel = drawing()
  vessel.filter = 'blur(1.5px)'
  silhouette(vessel, location.buildings[1], 255)
  const boat = vessel.getImageData(0, 0, WIDTH, HEIGHT).data
  const water = falls.getImageData(0, 0, WIDTH, HEIGHT).data
  for (let i = 0; i < field.length; i += 4) {
    field[i + 1] = fabric[i + 3]
    field[i + 2] = Math.max(light[i + 3], boat[i + 3])
    field[i + 3] = water[i + 3]
  }
  function depthAt(x: number, y: number) {
    return field[(Math.floor(y / 100 * HEIGHT) * WIDTH + Math.floor(x / 100 * WIDTH)) * 4] / 255
  }
  return { width: WIDTH, height: HEIGHT, field, depthAt }
}
