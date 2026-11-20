import { randomFrom } from '../foundation/state'
import { clamp, type Composition, type Effect } from './model'

export const WIDTH = 960
export const HEIGHT = 600
export const MAX_MARKS = 112
const TAU = Math.PI * 2
const mix = (a: number, b: number, f: number) => a + (b - a) * f

interface Parameters {
  energy: number
  order: number
  density: number
  tension: number
  rhythm: number
  complexity: number
}

interface Mark {
  x: number
  y: number
  size: number
  rotation: number
  ink: number
  opacity: number
  aspect?: number
}

interface Sample {
  index: number
  u: number
  random: number
  phase: number
  p: Parameters
}

const wave = (phase: number, rhythm: number) => {
  const s = Math.sin(phase)
  return mix(s, Math.tanh(s * 3) / Math.tanh(3), rhythm)
}

const ring = (angle: number, radius: number, flatten = 1) =>
  ({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * flatten })

const fields: Record<Effect, (sample: Sample) => Mark> = {
  Orbit: ({ index, u, random, phase, p }) => {
    const band = index % 5
    const angle = u * TAU * 5 + phase * (band % 2 ? -1 : 1) + (random - 0.5) * (1 - p.order) * 0.95
    const radius = (55 + band * (29 + p.tension * 14) + random * 12) * (1 + 0.13 * wave(phase + band, p.rhythm))
    const { x, y } = ring(angle, radius, 0.54 + p.complexity * 0.32)
    const tilt = 0.36 * Math.sin(phase)
    return { x: x * Math.cos(tilt) - y * Math.sin(tilt), y: x * Math.sin(tilt) + y * Math.cos(tilt),
      size: 2.7 + random * 6 + p.complexity * 3, rotation: angle, ink: band, opacity: 0.44 + random * 0.55 }
  },
  Bloom: ({ index, u, random, phase, p }) => {
    const petal = index % 9
    const angle = petal * TAU / 9 + u * (1.9 - p.order * 1.5) + Math.sin(phase) * 0.21 + (random - 0.5) * (1 - p.order)
    const bloom = 0.5 + 0.5 * wave(phase - petal * (1 - p.rhythm) * 0.14, p.rhythm)
    const radius = 20 + u * (65 + p.tension * 145) * (0.18 + bloom * 0.82)
    return { ...ring(angle, radius), size: 8 + u * (14 + p.complexity * 22), rotation: angle,
      ink: petal, aspect: 2.3, opacity: 0.24 + u * 0.48 }
  },
  Flow: ({ index, u, random, phase, p }) => {
    const lane = index % 7
    const x = (u - 0.5) * 690
    const a = u * (4 + p.complexity * 5) - phase + lane * (0.48 - p.order * 0.32)
    const amplitude = 38 + p.tension * 95
    return { x, y: wave(a, p.rhythm) * amplitude + (lane - 3) * 24 + (1 - p.order) * (random - 0.5) * 32,
      size: 5.6 + p.complexity * 5, aspect: 4.1, rotation: Math.atan(Math.cos(a) * amplitude * (4 + p.complexity * 5) / 690),
      ink: lane, opacity: 0.55 + 0.4 * random }
  },
  Collapse: ({ index, u, random, phase, p }) => {
    const quadrant = index % 4
    const edge = (u * 4) % 1 - 0.5
    const angle = quadrant * Math.PI / 2 + (1 - p.order) * (random - 0.5)
    const pull = 0.5 + 0.5 * wave(phase - u * (2 - p.rhythm), p.rhythm)
    const r = (65 + u * 140) * (1 - p.tension * pull * 0.87)
    const x = r, y = edge * r * (1.1 + p.complexity)
    return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle),
      size: 7 + random * 9, aspect: 1.8, rotation: angle + pull * p.tension, ink: quadrant, opacity: 0.65 + 0.3 * random }
  },
  'Attract / Repel': ({ index, u, random, phase, p }) => {
    const side = index % 2 ? 1 : -1
    const angle = u * TAU * 3 + phase * side + (random - 0.5) * (1 - p.order)
    const field = wave(phase + u * (1 - p.rhythm), p.rhythm)
    const radius = 30 + u * (70 + p.complexity * 36)
    const { x, y } = ring(angle, radius * (1 + field * p.tension * 0.48), 0.84)
    return { x: x + side * (104 + field * p.tension * 83), y: y + side * 19,
      size: 3.5 + random * 7, rotation: angle, ink: side > 0 ? index % 4 : (index % 4) + 1, opacity: 0.44 + 0.53 * random }
  },
  Echo: ({ index, u, random, phase, p }) => {
    const strand = index % 3
    const a = phase - u * (1.3 + p.complexity * 5) + strand * TAU / 3
    const radius = 85 + p.tension * 110
    return { x: Math.sin(a) * radius + (random - 0.5) * 46 * (1 - p.order),
      y: wave(a * 2 + strand, p.rhythm) * radius * 0.46, size: 5 + (1 - u) * (13 + p.complexity * 9),
      rotation: a, ink: strand, opacity: 0.14 + Math.pow(1 - u, 1.65) * 0.82 }
  },
  'Split / Merge': ({ index, u, random, phase, p }) => {
    const group = index % 3
    const angle = group * TAU / 3
    const separation = Math.pow(0.5 + 0.5 * wave(phase - u * (1 - p.rhythm), p.rhythm), 1.2)
    const origin = ring(angle, separation * (43 + p.tension * 128))
    const point = ring(u * TAU * (3 + p.complexity * 3) + angle + random * (1 - p.order),
      15 + u * (33 + separation * 54))
    return { x: point.x + origin.x, y: point.y + origin.y, size: 7 + u * 10 + separation * 4,
      rotation: angle + separation * (1.2 + u * 2), ink: group, opacity: 0.38 + random * 0.55 }
  },
  Distortion: ({ index, u, random, phase, p }) => {
    const cell = (index * 17) % 120
    const col = cell % 12, row = Math.floor(cell / 12)
    const x = (col - 5.5) * (36 + p.density * 7)
    const y = (row - 4.5) * 47
    const a = Math.hypot(x, y) / (68 - p.complexity * 31) - phase
    const warp = wave(a, p.rhythm) * (14 + p.tension * 61)
    return { x: x + warp * Math.sin(y / 85) + random * (1 - p.order) * 19,
      y: y + warp * Math.cos(x / 90), size: 10 + 14 * (0.5 + 0.5 * Math.sin(a)), rotation: warp / 76,
      ink: Math.floor(u * 4), aspect: 1.5, opacity: 0.52 + random * 0.36 }
  },
}

export function sampleFrame(composition: Composition, time: number): Mark[] {
  const { Energy, Order, Density, Tension, Rhythm, Complexity } = composition.values
  const p = { energy: Energy / 100, order: Order / 100, density: Density / 100,
    tension: Tension / 100, rhythm: Rhythm / 100, complexity: Complexity / 100 }
  const angle = (clamp(time, 0, composition.duration) % composition.duration) / composition.duration * TAU
  // Harmonic modulation changes velocity continuously and closes at the end of the loop.
  const phase = angle + p.energy * 0.48 * Math.sin(angle * 2)
  const count = 16 + p.density * (MAX_MARKS - 17)
  const random = randomFrom(composition.seed)
  const marks: Mark[] = []
  for (let index = 0; index < Math.ceil(count); index++) {
    const r = random()
    const u = (index * 0.61803398875) % 1
    const mark = fields[composition.effect]({ index, u, random: r, phase, p })
    const amplification = (0.68 + p.energy * 0.46) * (composition.effect === 'Flow' ? 1 : 1.14)
    marks.push({ ...mark, x: mark.x * amplification, y: mark.y * amplification,
      opacity: mark.opacity * clamp(count - index) })
  }
  return marks
}
