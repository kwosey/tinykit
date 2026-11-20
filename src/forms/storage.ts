import { readLocal, writeLocal } from '../foundation/storage'
import { decodeComposition, type Composition } from './model'

export const DRAFT = 'tinykit.form-lab.v1.draft'
export const COLLECTION = 'tinykit.form-lab.v1.kept.'
type Local = () => Storage

export function readDraft(local: Local) {
  return readLocal(local, DRAFT, decodeComposition)
}

export function saveDraft(local: Local, value: Composition) {
  const previous = readDraft(local)
  return (previous.status === 'empty' || previous.status === 'ok') && writeLocal(local, DRAFT, value)
}

interface Entry { id: string; savedAt: number; value: Composition }

function readEntry(raw: string, id: string): Entry | null {
  try {
    const entry = JSON.parse(raw)
    if (entry?.id !== id || !Number.isSafeInteger(entry.savedAt) || entry.savedAt < 0) return null
    const value = decodeComposition(JSON.stringify(entry.value))
    return value ? { id, value, savedAt: entry.savedAt } : null
  } catch { return null }
}

export function readCollection(local: Local) {
  const entries: Entry[] = []
  let damaged = 0
  try {
    const storage = local()
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!key?.startsWith(COLLECTION)) continue
      const entry = readEntry(storage.getItem(key) ?? '', key.slice(COLLECTION.length))
      if (entry) entries.push(entry)
      else damaged++
    }
    entries.sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id))
    return { entries, damaged, unavailable: false }
  } catch { return { entries, damaged, unavailable: true } }
}

export function keep(local: Local, value: Composition, id: string, savedAt: number) {
  const { unavailable, entries } = readCollection(local)
  if (unavailable) return 'failed'
  // Normalize field order before comparing an imported document with a local snapshot.
  const fingerprint = JSON.stringify(decodeComposition(JSON.stringify(value)))
  if (entries.some(entry => JSON.stringify(entry.value) === fingerprint)) return 'duplicate'
  const key = COLLECTION + id
  try {
    if (local().getItem(key) !== null) return 'failed'
    return writeLocal(local, key, { id, savedAt, value }) ? 'kept' : 'failed'
  } catch { return 'failed' }
}

export function remove(local: Local, id: string) {
  const key = COLLECTION + id
  try {
    const storage = local()
    if (!readEntry(storage.getItem(key) ?? '', id)) return false
    storage.removeItem(key)
    return true
  } catch { return false }
}
