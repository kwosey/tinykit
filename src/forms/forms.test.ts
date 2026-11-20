import { describe, expect, it } from 'vitest'
import { playback } from '../foundation/playback'
import { commit, history, redo, undo } from '../foundation/state'
import { MAX_MARKS, sampleFrame } from './effects'
import { decodeComposition, effects, mutate, nextComposition, parameters, presets } from './model'
import { COLLECTION, DRAFT, keep, readCollection, readDraft, remove, saveDraft } from './storage'

const initial = presets[0].value

function memory() {
  const map = new Map<string, string>()
  const storage: Storage = {
    get length() { return map.size },
    key: index => [...map.keys()][index] ?? null,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: key => { map.delete(key) },
    clear: () => map.clear(),
  }
  return () => storage
}

describe('composition', () => {
  it('generates reproducible alternatives and keeps every parameter in bounds', () => {
    const result = nextComposition(initial, 84)
    expect(nextComposition(initial, 84)).toEqual(result)
    expect(result.effect).not.toBe(initial.effect)
    const different = new Set<string>()
    for (let seed = 0; seed < 100; seed++) {
      const value = nextComposition(initial, seed)
      different.add(value.effect)
      expect(decodeComposition(JSON.stringify(value))).toEqual(value)
    }
    expect(different.size).toBe(effects.length - 1)
  })

  it('mutates unlocked values only and integrates with undo and redo', () => {
    const locked = { ...initial, locks: { ...initial.locks, Energy: true } }
    const varied = mutate(locked, 9)
    expect(mutate(locked, 9)).toEqual(varied)
    expect(varied.seed).toBe(initial.seed)
    expect(varied.effect).toBe(initial.effect)
    expect(varied.shape).toBe(initial.shape)
    expect(varied.palette).toBe(initial.palette)
    expect(varied.values.Energy).toBe(initial.values.Energy)
    expect(varied.values.Order).not.toBe(initial.values.Order)
    const changed = commit(history(locked), varied)
    expect(undo(changed).current).toBe(locked)
    expect(redo(undo(changed)).current).toBe(varied)
    const all = { ...locked, locks: Object.fromEntries(parameters.map(key => [key, true])) as typeof locked.locks }
    expect(mutate(all, 3)).toBe(all)
  })

  it('rejects invalid JSON, ranges, variants and schemas', () => {
    expect(decodeComposition('{bad')).toBeNull()
    expect(decodeComposition('{"version":1,"objects":[]}')).toBeNull()
    for (const invalid of [
      { ...initial, version: 2 }, { ...initial, seed: -1 }, { ...initial, shape: 'noise' },
      { ...initial, duration: 0 }, { ...initial, palette: 'constructor' },
      { ...initial, values: { ...initial.values, Order: 101 } },
      { ...initial, locks: { ...initial.locks, Order: 'true' } },
    ]) expect(decodeComposition(JSON.stringify(invalid))).toBeNull()
  })
})

describe('time and effects', () => {
  it('reproduces distinct, finite frames for all eight effects with smooth loop boundaries', () => {
    const frames = presets.map(({ value }) => {
      const start = sampleFrame(value, 0)
      const nearEnd = sampleFrame(value, value.duration - 0.000001)
      const frame = sampleFrame(value, 3.2)
      expect(frame).toEqual(sampleFrame(value, 3.2))
      expect(frame).not.toEqual(start)
      expect(sampleFrame(value, value.duration)).toEqual(start)
      expect(frame.length).toBeLessThanOrEqual(MAX_MARKS)
      for (let i = 0; i < frame.length; i++) {
        expect(Object.values(frame[i]).every(Number.isFinite)).toBe(true)
        expect(nearEnd[i].x).toBeCloseTo(start[i].x, 2)
        expect(nearEnd[i].y).toBeCloseTo(start[i].y, 2)
      }
      return JSON.stringify(frame)
    })
    expect(new Set(frames).size).toBe(effects.length)
  })

  it('responds to every control across all effects and stays bounded at extremes', () => {
    for (const { value } of presets) for (const parameter of parameters) {
      const low = sampleFrame({ ...value, values: { ...value.values, [parameter]: 0 } }, 2.3)
      const high = sampleFrame({ ...value, values: { ...value.values, [parameter]: 100 } }, 2.3)
      expect(low).not.toEqual(high)
      expect(high.length).toBeLessThanOrEqual(MAX_MARKS)
      expect(high.every(mark => Object.values(mark).every(Number.isFinite))).toBe(true)
    }
  })

  it('adds marks to Distortion without pushing existing marks apart', () => {
    const grid = presets.find(preset => preset.value.effect === 'Distortion')!.value
    const sparse = sampleFrame({ ...grid, values: { ...grid.values, Density: 0 } }, 2)
    const dense = sampleFrame({ ...grid, values: { ...grid.values, Density: 100 } }, 2)
    expect(dense.length).toBeGreaterThan(sparse.length)
    expect(dense.slice(0, sparse.length)).toEqual(sparse)
  })

  it('replays and scrubs without mutating previously sampled frames', () => {
    const resting = { time: 0, playing: false }
    const playing = playback(resting, { type: 'play' }, initial.duration)
    const crossed = playback(playing, { type: 'tick', delta: 15, loop: true }, initial.duration)
    expect(crossed).toEqual({ time: 3, playing: true })
    const paused = playback(crossed, { type: 'pause' }, initial.duration)
    const scrubbed = playback(paused, { type: 'scrub', time: 3 }, initial.duration)
    expect(sampleFrame(initial, scrubbed.time)).toEqual(sampleFrame(initial, crossed.time))
    expect(playback(scrubbed, { type: 'restart' }, initial.duration)).toEqual(resting)
    expect(playback(playing, { type: 'tick', delta: 15, loop: false }, initial.duration))
      .toEqual({ time: 12, playing: false })
  })
})

describe('local data', () => {
  it('keeps independent snapshots and leaves both Tiny Scenes storage versions intact', () => {
    const local = memory()
    const keys = ['tinykit.scene.v1', 'tinykit.scenes.v1.saved', 'tinykit.scenes.v1.draft', 'tinykit.scenes.v2.draft']
    keys.forEach(key => local().setItem(key, 'existing value'))
    expect(saveDraft(local, initial)).toBe(true)
    expect(readDraft(local)).toEqual({ status: 'ok', value: initial })
    expect(keep(local, initial, 'one', 1)).toBe('kept')
    expect(keep(local, initial, 'two', 2)).toBe('duplicate')
    const changed = mutate(initial, 3)
    expect(saveDraft(local, changed)).toBe(true)
    expect(readCollection(local).entries[0].value).toEqual(initial)
    expect(remove(local, 'one')).toBe(true)
    expect(readCollection(local).entries).toEqual([])
    keys.forEach(key => expect(local().getItem(key)).toBe('existing value'))
  })

  it('protects an invalid draft and isolates unreadable collection entries', () => {
    const local = memory()
    local().setItem(DRAFT, '{bad')
    local().setItem(COLLECTION + 'damaged', 'null')
    expect(readDraft(local).status).toBe('invalid')
    expect(saveDraft(local, initial)).toBe(false)
    expect(local().getItem(DRAFT)).toBe('{bad')
    expect(keep(local, initial, 'valid', 9)).toBe('kept')
    expect(readCollection(local)).toMatchObject({ damaged: 1, unavailable: false, entries: [{ id: 'valid' }] })
    expect(remove(local, 'damaged')).toBe(false)
    expect(local().getItem(COLLECTION + 'damaged')).toBe('null')
  })
})
