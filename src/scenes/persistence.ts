import { actions, environments, HEIGHT, kinds, WIDTH, type Scene } from './model'

export const DRAFT_KEY = 'tinykit.scenes.v1.draft'
export const SAVED_KEY = 'tinykit.scenes.v1.saved'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const between = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && min <= value && value <= max
const member = (options: readonly string[], value: unknown) =>
  typeof value === 'string' && options.includes(value)

export function decodeScene(raw: string): Scene | null {
  let scene: unknown
  try { scene = JSON.parse(raw) } catch { return null }
  if (!record(scene) || scene.version !== 1 || !member(environments, scene.environment) ||
      !between(scene.duration, 2, 10) || !between(scene.seed, 0, 4294967295) ||
      !Number.isInteger(scene.seed) || !Array.isArray(scene.objects) || scene.objects.length > 200) return null

  const ids = new Set<string>()
  for (const object of scene.objects) {
    if (!record(object) || typeof object.id !== 'string' || object.id.length < 1 ||
        object.id.length > 80 || ids.has(object.id) || !member(kinds, object.kind) ||
        !between(object.x, 0, WIDTH) || !between(object.y, 0, HEIGHT) ||
        !between(object.size, 0.25, 3) || typeof object.color !== 'string' ||
        !/^#[0-9a-f]{6}$/i.test(object.color) || typeof object.text !== 'string' ||
        object.text.length > 48 || typeof object.locked !== 'boolean') return null
    const motion = object.motion
    if (!record(motion) || !member(actions, motion.action) || !between(motion.start, 0, 10) ||
        !between(motion.duration, 0.1, 10) || !between(motion.intensity, 0.1, 3) ||
        !between(motion.dx, -WIDTH, WIDTH) || !between(motion.dy, -HEIGHT, HEIGHT)) return null
    ids.add(object.id)
  }
  return scene as unknown as Scene
}
