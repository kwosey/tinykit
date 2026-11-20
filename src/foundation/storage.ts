export type ReadResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'empty' | 'invalid' | 'unavailable' }

export function readLocal<T>(
  storage: () => Pick<Storage, 'getItem'>, key: string, decode: (text: string) => T | null,
): ReadResult<T> {
  try {
    const raw = storage().getItem(key)
    if (raw === null) return { status: 'empty' }
    const value = decode(raw)
    return value === null ? { status: 'invalid' } : { status: 'ok', value }
  } catch {
    return { status: 'unavailable' }
  }
}

export function writeLocal<T>(storage: () => Pick<Storage, 'setItem'>, key: string, value: T): boolean {
  try {
    storage().setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
