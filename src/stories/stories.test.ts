import { describe, expect, it } from 'vitest'
import { updateObject } from '../scenes/model'
import { playback, poseAt } from '../scenes/motion'
import { DRAFT_KEY, SAVED_KEY } from '../scenes/persistence'
import v1 from '../../tests/fixtures/scene-v1.json'
import unconfirmed from '../../tests/fixtures/prototype-unconfirmed.json'
import {
  anotherStory, beatRoles, chooseEnding, compileStory, families, generateStory, grammar,
  mutateStory, retimeBeat, setCast, varyStoryScenery, type Role, type Story,
} from './grammar'
import {
  decodeDocument, deleteKept, keepDocument, KEPT_PREFIX, LEGACY_KEY, listKept, readOldScene,
  recoverDraft, saveDraft, STORY_DRAFT,
} from './storage'

function castPose(story: Story, role: Role, time: number) {
  return poseAt(compileStory(story).objects.find(object => object.id === story.cast[role])!, time)
}

describe('story grammar', () => {
  it('reproduces every seeded story and explores timings, cast, scenery and endings', () => {
    for (const family of families) {
      const samples = Array.from({ length: 60 }, (_, seed) => generateStory(seed, family))
      expect(new Set(samples.map(story => story.beats[2].variant)).size).toBe(grammar[family].endings.length)
      expect(new Set(samples.map(story => story.beats[1].time)).size).toBeGreaterThan(2)
      expect(new Set(samples.map(story => story.scene.objects[0].x)).size).toBeGreaterThan(2)
      for (const story of samples) {
        expect(generateStory(story.scene.seed, family)).toEqual(story)
        expect(decodeDocument(JSON.stringify(story))).toEqual(story)
        const compiled = compileStory(story)
        story.beats.forEach((beat, index) => {
          expect(beat.time).toBeLessThan(compiled.duration)
          for (const role of beatRoles(story, index)) expect(compiled.objects.some(object => object.id === story.cast[role])).toBe(true)
        })
        for (const object of compiled.objects) {
          for (const motion of object.track ?? []) {
            expect(motion.duration).toBeGreaterThan(0)
            expect(motion.start + motion.duration).toBeLessThanOrEqual(compiled.duration + 1e-9)
          }
        }
      }
    }
  })

  it('makes both strangers meet before every outcome and gives each outcome a distinct final frame', () => {
    for (const family of families) {
      const original = generateStory(144, family)
      const all = grammar[family].endings.map((_, variant) => chooseEnding(original, variant))
      const final = all.map(story => {
        const scene = compileStory(story)
        return JSON.stringify([scene.environmentChange, ...scene.objects.map(object => poseAt(object, scene.duration))])
      })
      expect(new Set(final).size).toBe(all.length)
      if (family === 'meeting') for (const story of all) {
        expect(castPose(story, 'lead', 0).x).toBeLessThan(castPose(story, 'partner', 0).x)
        expect(castPose(story, 'partner', story.beats[1].time).x - castPose(story, 'lead', story.beats[1].time).x).toBe(46)
      }
    }
  })

  it('sequences a barrier and an arriving visitor only after their setup', () => {
    const blocked = chooseEnding(generateStory(4, 'journey'), 2)
    expect(castPose(blocked, 'guest', blocked.beats[1].time).opacity).toBe(0)
    expect(castPose(blocked, 'guest', blocked.scene.duration).opacity).toBe(1)
    expect(castPose(blocked, 'lead', blocked.scene.duration).x).toBeLessThan(castPose(blocked, 'guest', blocked.scene.duration).x)
    const visit = chooseEnding(generateStory(5, 'alone'), 3)
    expect(castPose(visit, 'visitor', 0).opacity).toBe(0)
    expect(castPose(visit, 'visitor', visit.scene.duration)).toMatchObject({ opacity: 1, x: 492 })
  })

  it('rejects missing or incompatible actors, invalid phases, variants and timing', () => {
    const story = generateStory(1)
    const copy = () => structuredClone(story)
    const variants = [
      (value: Story) => { value.cast.lead = 'unknown' },
      (value: Story) => { value.cast.lead = value.cast.landmark },
      (value: Story) => { value.beats[1].time = value.beats[2].time },
      (value: Story) => { value.beats[2].variant = 99 },
      (value: Story) => { Object.assign(value.beats[0], { phase: 'event' }) },
      (value: Story) => { value.manualMotion.push('unknown') },
    ]
    for (const corrupt of variants) {
      const value = copy()
      corrupt(value)
      expect(decodeDocument(JSON.stringify(value))).toBeNull()
    }
  })
})

describe('story variation and directing', () => {
  it('Another Story changes family and Mutate changes only the open ending and seed', () => {
    const story = generateStory(34, 'meeting')
    story.beats[0].locked = story.beats[1].locked = true
    const variation = mutateStory(story, 268)
    expect(anotherStory(story, 268).family).not.toBe(story.family)
    expect(mutateStory(story, 268)).toEqual(variation)
    expect(variation.beats[2].variant).not.toBe(story.beats[2].variant)
    expect(variation.beats.slice(0, 2)).toEqual(story.beats.slice(0, 2))
    for (const time of [0, story.beats[1].time, story.beats[2].time - 0.01]) {
      const frame = (value: Story) => compileStory(value).objects.map(object => poseAt(object, time))
      expect(frame(variation)).toEqual(frame(story))
    }
    story.beats[2].locked = true
    expect(mutateStory(story, 99)).toBe(story)
    expect(varyStoryScenery(story, 99)).toBe(story)
  })

  it('keeps direct object, timing and environment edits through mutation and honours manual motion', () => {
    const story = generateStory(14, 'meeting')
    story.scene = updateObject(story.scene, 'lead', { x: 300, color: '#aabbcc' })
    story.scene.environment = 'Night'
    story.beats[2].time = 4.9
    const variant = mutateStory(story, 890)
    expect(variant.scene.objects).toEqual(story.scene.objects)
    expect(variant.scene.environment).toBe('Night')
    expect(variant.beats[2].time).toBe(4.9)
    story.manualMotion.push('lead')
    expect(mutateStory(story, 890)).toBe(story)
    expect(castPose(story, 'lead', 6).x).toBe(300)
    expect(varyStoryScenery(story, 99).scene.objects.find(object => object.id === 'lead')?.color).toBe('#aabbcc')
  })

  it('reassigns only a suitable unused role and protects locked events', () => {
    const story = generateStory(14, 'meeting')
    expect(setCast(story, 'lead', 'landmark')).toBe(story)
    expect(setCast(story, 'lead', 'guest')).toBe(story)
    const tree = story.scene.objects.find(object => object.id === 'grove')!
    expect(setCast(story, 'landmark', tree.id).cast.landmark).toBe(tree.id)
    story.beats[1].locked = true
    expect(setCast(story, 'landmark', tree.id)).toBe(story)
  })

  it('retimes within adjacent beats and protects a locked preceding cue', () => {
    const original = generateStory(14, 'meeting')
    const changed = retimeBeat(original, 1, 1.2)
    expect(changed.beats[1].time).toBe(1.2)
    expect(retimeBeat(changed, 2, 1.5)).toBe(changed)
    expect(retimeBeat(changed, 2, changed.scene.duration - 0.75)).toBe(changed)
    expect(decodeDocument(JSON.stringify(changed))).toEqual(changed)
    changed.beats[1].locked = true
    expect(retimeBeat(changed, 2, 2.8)).toBe(changed)
  })

  it('samples consecutive motion continuously and replays or scrubs without accumulation', () => {
    const story = chooseEnding(generateStory(92, 'meeting'), 0)
    const duration = story.scene.duration
    const start = { time: 0, playing: false }
    const event = story.beats[1].time
    const outcome = story.beats[2].time
    const pose = (time: number) => castPose(story, 'lead', time)
    const expected = pose(outcome + 0.5)
    for (const time of [event, outcome]) {
      expect(pose(time - 0.00001).x).toBeCloseTo(pose(time).x, 2)
      expect(pose(time + 0.00001).x).toBeCloseTo(pose(time).x, 2)
    }
    let clock = start
    for (let attempt = 0; attempt < 10; attempt++) {
      clock = playback(clock, { type: 'play' }, duration)
      clock = playback(clock, { type: 'tick', delta: duration + outcome + 0.5, loop: true }, duration)
      expect(pose(clock.time).x).toBeCloseTo(expected.x, 9)
      clock = playback(clock, { type: 'pause' }, duration)
      clock = playback(clock, { type: 'scrub', time: outcome + 0.5 }, duration)
      expect(pose(clock.time)).toEqual(expected)
      clock = playback(clock, { type: 'restart' }, duration)
      expect(clock).toEqual(start)
    }
  })
})

describe('story storage', () => {
  function memory(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial))
    const mock: Storage = {
      get length() { return data.size },
      key: index => [...data.keys()][index] ?? null,
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => { data.set(key, value) },
      removeItem: key => { data.delete(key) },
      clear: () => { data.clear() },
    }
    return () => mock
  }

  it('recovers v0.1 drafts, saves and imports as free scenes and preserves original bytes', () => {
    const raw = JSON.stringify(v1)
    const storage = memory({ [DRAFT_KEY]: raw, [SAVED_KEY]: raw })
    expect(recoverDraft(storage).document).toEqual(v1)
    const saved = readOldScene(storage, 'v0.1 save')
    expect(saved.status === 'ok' && saved.value).toEqual(v1)
    expect(decodeDocument(raw)).toEqual(v1)
    expect(saveDraft(storage, generateStory(11))).toBe(true)
    expect(storage().getItem(DRAFT_KEY)).toBe(raw)
    expect(storage().getItem(SAVED_KEY)).toBe(raw)
  })

  it('keeps independent immutable snapshots, skips exact duplicates and can delete valid entries', () => {
    const corrupt = KEPT_PREFIX + 'corrupt'
    const storage = memory({ [corrupt]: '{broken' })
    const story = generateStory(56)
    expect(keepDocument(storage, story, 'one', 100)).toBe('kept')
    expect(keepDocument(storage, story, 'two', 120)).toBe('duplicate')
    const variation = mutateStory(story, 9)
    expect(keepDocument(storage, variation, 'two', 130)).toBe('kept')
    const collection = listKept(storage)
    expect(collection.invalid).toBe(1)
    expect(collection.entries.map(entry => entry.document)).toEqual([variation, story])
    expect(deleteKept(storage, 'two')).toBe(true)
    expect(deleteKept(storage, 'corrupt')).toBe(false)
    expect(listKept(storage).entries.map(entry => entry.id)).toEqual(['one'])
    expect(storage().getItem(corrupt)).toBe('{broken')
  })

  it('preserves unsupported prototype data and blocks replacement of an invalid v2 draft', () => {
    const original = JSON.stringify(unconfirmed)
    const storage = memory({ [STORY_DRAFT]: '{broken', [LEGACY_KEY]: original, [SAVED_KEY]: '{broken' })
    expect(recoverDraft(storage).warning).toContain('protected')
    expect(recoverDraft(storage).document).toBeUndefined()
    expect(saveDraft(storage, generateStory(11))).toBe(false)
    expect(readOldScene(storage, 'v0.1 save').status).toBe('invalid')
    expect(storage().getItem(STORY_DRAFT)).toBe('{broken')
    expect(storage().getItem(LEGACY_KEY)).toBe(original)
  })
})
