import { readLocal, writeLocal } from '../foundation/storage'
import { environments, type Scene } from '../scenes/model'
import { between, DRAFT_KEY, readScene, record, SAVED_KEY, decodeScene } from '../scenes/persistence'
import { families, grammar, roleKind, storyRoles, type Family, type Story } from './grammar'

export type Document = Scene | Story
export const STORY_DRAFT = 'tinykit.scenes.v2.draft'
export const KEPT_PREFIX = 'tinykit.scenes.v2.kept.'
export const LEGACY_KEY = 'tinykit.scene.v1'

export function activeScene(document: Document): Scene {
  return document.version === 2 ? document.scene : document
}

export function readDocument(value: unknown): Document | null {
  if (!record(value) || value.version !== 2) return readScene(value)
  const scene = readScene(value.scene)
  if (!scene || !families.includes(value.family as Family) || !between(value.distance, 100, 220) ||
      !environments.some(preset => preset === value.nextEnvironment)) return null
  const family = value.family as Family
  const beats = value.beats
  if (!Array.isArray(beats) || beats.length !== 3 || !beats.every(beat =>
    record(beat) && between(beat.time, 0, scene.duration) && typeof beat.locked === 'boolean')) return null
  if (beats[0].phase !== 'setup' || beats[1].phase !== 'event' || beats[2].phase !== 'outcome' ||
      beats[0].time !== 0 || beats[1].time < 0.5 || beats[2].time < beats[1].time + 0.5 - 1e-9 ||
      scene.duration < beats[2].time + 1 - 1e-9 ||
      !between(beats[2].variant, 0, grammar[family].endings.length - 1) || !Number.isInteger(beats[2].variant)) return null
  const cast = value.cast
  if (!record(cast) || Object.keys(cast).length !== storyRoles().length ||
      new Set(Object.values(cast)).size !== storyRoles().length || !storyRoles().every(role =>
        scene.objects.some(object => object.id === cast[role] && object.kind === roleKind(family, role)))) return null
  for (const manual of [value.manualMotion, value.manualStyle]) {
    if (!Array.isArray(manual) || new Set(manual).size !== manual.length ||
        !manual.every(id => scene.objects.some(object => object.id === id))) return null
  }
  return value as unknown as Story
}

export function decodeDocument(raw: string): Document | null {
  try { return readDocument(JSON.parse(raw)) } catch { return null }
}

export function recoverDraft(storage: () => Storage) {
  const current = readLocal(storage, STORY_DRAFT, decodeDocument)
  if (current.status === 'ok') return { document: current.value, warning: '' }
  const previous = readLocal(storage, DRAFT_KEY, decodeScene)
  const original = readLocal(storage, LEGACY_KEY, decodeScene)
  const warning = current.status === 'invalid' || current.status === 'unavailable'
    ? 'The current draft could not be read. Its data is protected.'
    : previous.status === 'invalid' || original.status === 'invalid'
      ? 'An older draft has an unsupported format. Its data is protected.' : ''
  return { document: previous.status === 'ok' ? previous.value : original.status === 'ok' ? original.value : undefined, warning }
}

export function saveDraft(storage: () => Storage, document: Document) {
  const existing = readLocal(storage, STORY_DRAFT, decodeDocument)
  return (existing.status === 'ok' || existing.status === 'empty') && writeLocal(storage, STORY_DRAFT, document)
}

export const oldScenes = {
  'v0.1 draft': DRAFT_KEY, 'v0.1 save': SAVED_KEY, 'prototype draft': LEGACY_KEY,
} as const

export function readOldScene(storage: () => Storage, name: keyof typeof oldScenes) {
  return readLocal(storage, oldScenes[name], decodeScene)
}

export interface Kept {
  id: string
  document: Document
  date: number
}

function decodeKept(raw: string, id: string): Kept | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || parsed.id !== id || !between(parsed.date, 0, Number.MAX_SAFE_INTEGER)) return null
    const document = readDocument(parsed.document)
    return document && { id, document, date: parsed.date }
  } catch { return null }
}

export function listKept(storage: () => Storage) {
  const entries: Kept[] = []
  let invalid = 0
  try {
    const local = storage()
    for (let index = 0; index < local.length; index++) {
      const key = local.key(index)
      if (!key?.startsWith(KEPT_PREFIX)) continue
      const raw = local.getItem(key)
      const entry = raw && decodeKept(raw, key.slice(KEPT_PREFIX.length))
      if (entry) entries.push(entry)
      else invalid++
    }
    entries.sort((a, b) => b.date - a.date || a.id.localeCompare(b.id))
    return { entries, invalid, unavailable: false }
  } catch { return { entries, invalid, unavailable: true } }
}

export function keepDocument(storage: () => Storage, document: Document, id: string, date: number) {
  const { entries, unavailable } = listKept(storage)
  if (unavailable) return 'failed'
  if (entries.some(entry => JSON.stringify(entry.document) === JSON.stringify(document))) return 'duplicate'
  const key = KEPT_PREFIX + id
  try {
    if (storage().getItem(key) !== null) return 'failed'
  } catch { return 'failed' }
  return writeLocal(storage, key, { id, document, date }) ? 'kept' : 'failed'
}

export function deleteKept(storage: () => Storage, id: string) {
  const key = KEPT_PREFIX + id
  try {
    const local = storage()
    const raw = local.getItem(key)
    if (!raw || !decodeKept(raw, id)) return false
    local.removeItem(key)
    return true
  } catch { return false }
}
