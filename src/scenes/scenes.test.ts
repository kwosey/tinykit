import { describe, expect, it } from 'vitest'
import { commit, history, randomFrom, redo, undo } from '../foundation/state'
import { readLocal, writeLocal } from '../foundation/storage'
import { addObject, deleteObject, initialScene, raiseObject, updateObject, varyScene } from './model'
import { playback, poseAt } from './motion'
import { decodeScene } from './persistence'

describe('scene editing', () => {
  it('adds, edits, raises and deletes with stable IDs', () => {
    const added = addObject(initialScene, 'Text', 'caption')
    expect(added.objects.at(-1)?.id).toBe('caption')
    expect(addObject(added, 'Text', 'caption')).toBe(added)
    const edited = updateObject(added, 'caption', { text: 'Hello', size: 2, x: 250 })
    expect(edited.objects.at(-1)).toMatchObject({ id: 'caption', text: 'Hello', size: 2, x: 250 })
    expect(raiseObject(edited, 'person').objects.at(-1)?.id).toBe('person')
    expect(deleteObject(edited, 'caption')).toEqual(initialScene)
  })

  it('reproduces variations and protects locked objects while allowing direct edits', () => {
    const locked = updateObject(initialScene, 'person', { locked: true })
    const mutated = varyScene(locked, 14, false)
    expect(mutated).toEqual(varyScene(locked, 14, false))
    expect(mutated).not.toEqual(varyScene(locked, 15, false))
    expect(mutated.objects[0]).not.toEqual(locked.objects[0])
    expect(mutated.objects.at(-1)).toBe(locked.objects.at(-1))
    expect(varyScene(locked, 14, true).objects.at(-1)).toBe(locked.objects.at(-1))
    expect(updateObject(mutated, 'person', { x: 100 }).objects.at(-1)?.x).toBe(100)
    const a = randomFrom(14)
    const b = randomFrom(14)
    expect([a(), a()]).toEqual([b(), b()])
  })

  it('undoes and redoes scene edits and clears redo on divergence', () => {
    const edited = deleteObject(initialScene, 'person')
    const committed = commit(history(initialScene), edited)
    const undone = undo(committed)
    expect(undone.current).toBe(initialScene)
    expect(redo(undone).current).toBe(edited)
    expect(commit(undone, deleteObject(initialScene, 'car')).future).toEqual([])
  })
})

describe('motion and playback', () => {
  it('derives movement from time in either direction without accumulating state', () => {
    const person = initialScene.objects.at(-1)!
    const object = { ...person, motion: { ...person.motion, start: 1, duration: 2, dx: 100, dy: -40 } }
    expect(poseAt(object, 0)).toMatchObject({ x: object.x, y: object.y })
    expect(poseAt(object, 8)).toMatchObject({ x: object.x + 100, y: object.y - 40 })
    expect(poseAt(object, 2)).toMatchObject({ x: object.x + 50, y: object.y - 20 })
  })

  it('applies all appearance and transform actions', () => {
    const person = initialScene.objects.at(-1)!
    const sample = (action: typeof person.motion.action, time: number) =>
      poseAt({ ...person, motion: { ...person.motion, action, start: 1, duration: 4, intensity: 1 } }, time)
    expect(sample('Still', 2)).toMatchObject({ x: person.x, y: person.y, size: person.size, rotation: 0, opacity: 1 })
    expect(sample('Float', 2).y).toBeLessThan(person.y)
    expect(sample('Pulse', 2).size).toBeGreaterThan(person.size)
    expect(sample('Appear', 3).opacity).toBe(0.5)
    expect(sample('Disappear', 3).opacity).toBe(0.5)
    expect(sample('Rotate', 3).rotation).toBe(Math.PI)
    expect(sample('Scale', 3).size).toBe(1.25 * person.size)
  })

  it('plays, pauses, restarts, scrubs, loops and stops at the end', () => {
    const resting = { time: 0, playing: false }
    const playing = playback(resting, { type: 'play' }, 6)
    expect(playing.playing).toBe(true)
    const advanced = playback(playing, { type: 'tick', delta: 2, loop: false }, 6)
    expect(advanced).toEqual({ time: 2, playing: true })
    const paused = playback(advanced, { type: 'pause' }, 6)
    expect(playback(paused, { type: 'tick', delta: 2, loop: false }, 6)).toEqual(paused)
    expect(playback(paused, { type: 'restart' }, 6)).toEqual(resting)
    expect(playback(playing, { type: 'scrub', time: 5 }, 6)).toEqual({ time: 5, playing: false })
    expect(playback(advanced, { type: 'tick', delta: 5, loop: true }, 6)).toEqual({ time: 1, playing: true })
    expect(playback(advanced, { type: 'tick', delta: 5, loop: false }, 6)).toEqual({ time: 6, playing: false })
  })
})

describe('scene persistence', () => {
  it('round-trips local saves and distinguishes empty, invalid and unavailable storage', () => {
    const items = new Map<string, string>()
    const storage = () => ({
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => { items.set(key, value) },
    })
    expect(readLocal(storage, 'draft', decodeScene)).toEqual({ status: 'empty' })
    expect(writeLocal(storage, 'draft', initialScene)).toBe(true)
    expect(readLocal(storage, 'draft', decodeScene)).toEqual({ status: 'ok', value: initialScene })
    items.set('draft', '{broken')
    expect(readLocal(storage, 'draft', decodeScene)).toEqual({ status: 'invalid' })
    expect(items.get('draft')).toBe('{broken')
    expect(readLocal(() => { throw new Error('denied') }, 'draft', decodeScene)).toEqual({ status: 'unavailable' })
  })

  it('rejects unsupported versions, malformed motion and duplicate IDs', () => {
    expect(decodeScene('null')).toBeNull()
    expect(decodeScene(JSON.stringify({ ...initialScene, version: 2 }))).toBeNull()
    const [object] = initialScene.objects
    expect(decodeScene(JSON.stringify({ ...initialScene, objects: [object, object] }))).toBeNull()
    expect(decodeScene(JSON.stringify({ ...initialScene, objects: [{ ...object, motion: { ...object.motion, duration: 0 } }] }))).toBeNull()
  })
})
