import { randomFrom } from '../foundation/state'

export const WIDTH = 960
export const HEIGHT = 540
export const kinds = ['Person', 'Building', 'Tree', 'Car', 'Text'] as const
export const actions = ['Still', 'Move', 'Float', 'Pulse', 'Appear', 'Disappear', 'Rotate', 'Scale'] as const
export const environments = ['Dusk', 'Desert', 'Night'] as const
export type Kind = typeof kinds[number]
export type Action = typeof actions[number]
export type Environment = typeof environments[number]

export interface Motion {
  action: Action
  start: number
  duration: number
  intensity: number
  dx: number
  dy: number
}

export interface SceneObject {
  id: string
  kind: Kind
  x: number
  y: number
  size: number
  color: string
  text: string
  locked: boolean
  motion: Motion
}

export interface Scene {
  version: 1
  environment: Environment
  duration: number
  seed: number
  objects: SceneObject[]
}

export const colors = ['#ed916a', '#e6bc79', '#8d997a', '#73938b', '#d3978b', '#e9d6b3']
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high))

export function makeObject(kind: Kind, id: string, x = 480, y = 425): SceneObject {
  return {
    id, kind, x, y, size: 1, color: colors[kinds.indexOf(kind)], text: 'Hello, world',
    locked: false, motion: { action: 'Still', start: 0, duration: 4, intensity: 1, dx: 160, dy: 0 },
  }
}

export const initialScene: Scene = {
  version: 1, environment: 'Dusk', duration: 6, seed: 42,
  objects: [
    { ...makeObject('Building', 'building', 710, 378), size: 1.32, color: '#80605f' },
    { ...makeObject('Tree', 'tree-left', 176, 425), size: 1.32 },
    { ...makeObject('Tree', 'tree-right', 854, 408), size: 0.85 },
    { ...makeObject('Car', 'car', 626, 466), color: '#d98363' },
    { ...makeObject('Person', 'person', 364, 446), color: '#e9ae78',
      motion: { action: 'Move', start: 0, duration: 6, intensity: 2.5, dx: 125, dy: -7 } },
  ],
}

export function addObject(scene: Scene, kind: Kind, id: string): Scene {
  if (scene.objects.length >= 200 || scene.objects.some(object => object.id === id)) return scene
  const x = 400 + (scene.objects.length % 6) * 28
  return { ...scene, objects: [...scene.objects, makeObject(kind, id, x)] }
}

export function updateObject(scene: Scene, id: string, patch: Partial<Omit<SceneObject, 'id'>>): Scene {
  const current = scene.objects.find(object => object.id === id)
  if (!current || Object.entries(patch).every(([key, value]) => current[key as keyof SceneObject] === value)) return scene
  return { ...scene, objects: scene.objects.map(object => object.id === id ? { ...object, ...patch } : object) }
}

export function deleteObject(scene: Scene, id: string): Scene {
  const objects = scene.objects.filter(object => object.id !== id)
  return objects.length === scene.objects.length ? scene : { ...scene, objects }
}

export function raiseObject(scene: Scene, id: string): Scene {
  const object = scene.objects.find(candidate => candidate.id === id)
  if (!object || scene.objects.at(-1) === object) return scene
  return { ...scene, objects: [...scene.objects.filter(candidate => candidate !== object), object] }
}

export function varyScene(scene: Scene, seed: number, shuffle: boolean): Scene {
  const random = randomFrom(seed)
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]
  const environment = shuffle ? pick(environments) : scene.environment
  const objects = scene.objects.map(object => {
    if (object.locked) return object
    const x = shuffle ? 105 + random() * 750 : object.x + (random() - 0.5) * 145
    const y = shuffle ? 385 + random() * 80 : object.y + (random() - 0.5) * 56
    return {
      ...object, x: Math.round(clamp(x, 0, WIDTH)), y: Math.round(clamp(y, 0, HEIGHT)),
      color: pick(colors), size: Math.round((0.72 + random() * 0.75) * 100) / 100,
      motion: { ...object.motion, action: pick(shuffle ? actions : actions.slice(0, 4)) },
    }
  })
  return { ...scene, seed, environment, objects }
}
