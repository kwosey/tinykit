import { randomFrom } from '../foundation/state'

export const effects = ['Orbit', 'Bloom', 'Flow', 'Collapse', 'Attract / Repel', 'Echo', 'Split / Merge', 'Distortion'] as const
export const shapes = ['Circle', 'Rectangle', 'Triangle', 'Line', 'Dot', 'Rounded'] as const
export const parameters = ['Energy', 'Order', 'Density', 'Tension', 'Rhythm', 'Complexity'] as const
export const palettes = {
  'Ember': ['#19121c', '#fa795e', '#ffc67a', '#c66ee4', '#ffe0ad'],
  'Sea Glass': ['#0a2025', '#63dec5', '#afebd0', '#518dba', '#e4ffde'],
  'Ultraviolet': ['#171328', '#b59cff', '#eb9ddb', '#7369ed', '#ece2ff'],
  'Citron': ['#18201a', '#d9e674', '#9de1aa', '#60b58d', '#fff4b1'],
  'Oxide': ['#211819', '#e38a7c', '#fac5aa', '#9f626e', '#ffe0ca'],
} as const

export type Parameter = typeof parameters[number]
export type Effect = typeof effects[number]
export type Shape = typeof shapes[number]
export type Palette = keyof typeof palettes

export interface Composition {
  version: 1
  type: 'form-lab'
  effect: Effect
  shape: Shape
  palette: Palette
  seed: number
  duration: number
  values: Record<Parameter, number>
  locks: Record<Parameter, boolean>
}

export const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n))
const unlocked = Object.fromEntries(parameters.map(key => [key, false])) as Composition['locks']

function preset(
  name: string, effect: Effect, shape: Shape, palette: Palette, seed: number,
  [Energy, Order, Density, Tension, Rhythm, Complexity]: number[],
) {
  const value: Composition = {
    version: 1, type: 'form-lab', effect, shape, palette, seed, duration: 12,
    values: { Energy, Order, Density, Tension, Rhythm, Complexity }, locks: unlocked,
  }
  return { name, value }
}

export const presets = [
  preset('Orbital Loom', 'Orbit', 'Dot', 'Ember', 417, [61, 73, 72, 57, 48, 69]),
  preset('Petal Hour', 'Bloom', 'Rounded', 'Oxide', 2789, [45, 86, 50, 63, 66, 50]),
  preset('Tidal Thread', 'Flow', 'Line', 'Sea Glass', 110, [55, 61, 73, 55, 47, 65]),
  preset('Gravity Well', 'Collapse', 'Rectangle', 'Ultraviolet', 854, [47, 83, 67, 70, 61, 59]),
  preset('Magnetic Field', 'Attract / Repel', 'Dot', 'Citron', 103, [55, 50, 74, 84, 56, 57]),
  preset('Echo Chamber', 'Echo', 'Circle', 'Ultraviolet', 512, [65, 71, 64, 61, 43, 75]),
  preset('Prism Scatter', 'Split / Merge', 'Triangle', 'Ember', 764, [51, 82, 57, 68, 68, 59]),
  preset('Breathing Grid', 'Distortion', 'Rounded', 'Sea Glass', 999, [42, 83, 69, 60, 55, 72]),
]

export function nextComposition(current: Composition, seed: number): Composition {
  const options = presets.filter(item => item.value.effect !== current.effect)
  const random = randomFrom(seed)
  random()
  const next = options[Math.floor(random() * options.length)].value
  return { ...next, seed, values: Object.fromEntries(parameters.map(key =>
    [key, clamp(next.values[key] + Math.round((random() - 0.5) * 24), 0, 100)])) as Composition['values'] }
}

export function mutate(current: Composition, seed: number): Composition {
  const free = parameters.filter(key => !current.locks[key])
  if (!free.length) return current
  const random = randomFrom(seed)
  random()
  const values = { ...current.values }
  for (const key of free) {
    const delta = 6 + Math.floor(random() * 15)
    const sign = random() < 0.5 ? -1 : 1
    const next = clamp(values[key] + sign * delta, 0, 100)
    values[key] = next === values[key] ? values[key] - sign * delta : next
  }
  // The composition seed anchors object placement. The operation seed chooses the variation.
  return { ...current, values }
}

export function decodeComposition(raw: string): Composition | null {
  try {
    const document = JSON.parse(raw)
    if (document?.type !== 'form-lab' || document.version !== 1 ||
        !effects.includes(document.effect) || !shapes.includes(document.shape) ||
        !Object.hasOwn(palettes, document.palette) ||
        !Number.isInteger(document.seed) || document.seed < 0 || document.seed > 4294967295 ||
        !Number.isFinite(document.duration) || document.duration < 4 || document.duration > 30 ||
        !parameters.every(key => Number.isInteger(document.values?.[key]) &&
          document.values[key] >= 0 && document.values[key] <= 100 && typeof document.locks?.[key] === 'boolean')) return null
    const { effect, shape, palette, seed, duration, values, locks } = document
    return {
      version: 1, type: 'form-lab', effect, shape, palette, seed, duration,
      values: Object.fromEntries(parameters.map(key => [key, values[key]])) as Composition['values'],
      locks: Object.fromEntries(parameters.map(key => [key, locks[key]])) as Composition['locks'],
    }
  } catch { return null }
}
