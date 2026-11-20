import { randomFrom } from '../foundation/state'
import { colors, environments, makeObject, type Environment, type Motion, type Scene } from '../scenes/model'
import { poseAt } from '../scenes/motion'

export const grammar = {
  meeting: {
    title: 'The Meeting', setup: 'Two strangers approach', event: 'Their paths cross',
    endings: ['Go separate ways', 'Leave together', 'One vanishes', 'Pass without stopping', 'A third arrives'],
  },
  journey: {
    title: 'The Journey', setup: 'A traveler sets out', event: 'The destination comes into reach',
    endings: ['Reach the destination', 'The destination fades', 'A barrier rises', 'Turn back', 'The destination moves'],
  },
  alone: {
    title: 'Alone', setup: 'Friends share a quiet place', event: 'The group begins to disperse',
    endings: ['The others leave', 'The landmark fades', 'The clearing empties', 'A new friend arrives', 'The last person leaves'],
  },
  change: {
    title: 'The Change', setup: 'A tree stands in still light', event: 'The tree begins to grow',
    endings: ['The light changes', 'Another tree appears', 'The tree vanishes', 'The tree towers overhead'],
  },
} as const

export type Family = keyof typeof grammar
export const families: Family[] = ['meeting', 'journey', 'alone', 'change']
export const phases = ['Setup', 'Event', 'Outcome'] as const
const roles = ['lead', 'partner', 'guest', 'landmark', 'visitor'] as const
export type Role = typeof roles[number]
export type Cast = Record<Role, string>

interface BeatTiming {
  time: number
  locked: boolean
}

export type Beats = [
  BeatTiming & { phase: 'setup' },
  BeatTiming & { phase: 'event' },
  BeatTiming & { phase: 'outcome'; variant: number },
]
export type Beat = Beats[number]

export interface Story {
  version: 2
  family: Family
  beats: Beats
  cast: Cast
  scene: Scene
  manualMotion: string[]
  manualStyle: string[]
  distance: number
  nextEnvironment: Environment
}

export function lockBeat(story: Story, index: number, locked: boolean): Story {
  const next: Beats = [...story.beats]
  if (index === 0) next[0] = { ...next[0], locked }
  if (index === 1) next[1] = { ...next[1], locked }
  if (index === 2) next[2] = { ...next[2], locked }
  return { ...story, beats: next }
}

export function canRetime(story: Story, index: number) {
  return (index === 1 || index === 2) && !story.beats[index].locked &&
    !story.beats[index - 1].locked && !hasDirectedCast(story)
}

export function retimeBeat(story: Story, index: number, time: number): Story {
  if (!canRetime(story, index) || !Number.isFinite(time)) return story
  const [setup, event, outcome] = story.beats
  if (index === 1 && time >= 0.5 && time <= outcome.time - 0.5 + 1e-9) {
    return { ...story, beats: [setup, { ...event, time }, outcome] }
  }
  if (index === 2 && time >= event.time + 0.5 - 1e-9 && time <= story.scene.duration - 1 + 1e-9) {
    return { ...story, beats: [setup, event, { ...outcome, time }] }
  }
  return story
}

export function beatTitle(story: Story, index: number) {
  const rule = grammar[story.family]
  return [rule.setup, rule.event, rule.endings[story.beats[2].variant]][index]
}

export function beatRoles(story: Story, index: number): Role[] {
  switch (story.family) {
    case 'meeting': return index === 2 && story.beats[2].variant === 4 ? ['lead', 'partner', 'guest'] : ['lead', 'partner']
    case 'journey': return index === 2 && story.beats[2].variant === 2 ? ['lead', 'landmark', 'guest'] : ['lead', 'landmark']
    case 'alone':
      if (index < 2) return ['lead', 'partner', 'guest']
      return [
        ['partner', 'guest'], ['lead', 'landmark'], ['partner', 'guest', 'landmark'],
        ['lead', 'partner', 'visitor'], ['lead', 'partner'],
      ][story.beats[2].variant] as Role[]
    case 'change': return index === 2 && story.beats[2].variant === 1 ? ['landmark', 'guest'] : ['landmark']
  }
}

// The guest is a person in cast-driven stories and a tree in The Change.
export function roleKind(family: Family, role: Role) {
  if (role === 'landmark' || (role === 'guest' && family === 'change')) return 'Tree'
  if (role === 'guest' && family === 'journey') return 'Building'
  return 'Person'
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

export function generateStory(seed: number, family?: Family): Story {
  const random = randomFrom(seed)
  const selected = family ?? families[(seed >>> 0) % families.length]
  const environment = pick(environments, random)
  const t = (minimum: number, spread: number) => Math.round((minimum + random() * spread) * 10) / 10
  const cast: Cast = { lead: 'lead', partner: 'partner', guest: 'guest', landmark: 'landmark', visitor: 'visitor' }
  const y = t(424, 24)
  const distance = Math.round(t(120, 88))
  const actor = (role: Role, x: number, baseY: number) => ({
    ...makeObject(roleKind(selected, role), cast[role], x, baseY),
    color: pick(colors, random),
    size: t(0.95, 0.32),
  })
  const lead = actor('lead', t(130, 105), y)
  const partner = actor('partner', t(695, 115), y + 5)
  const landmark = actor('landmark', t(590, 79), y - 15)
  const guest = actor('guest', selected === 'journey' ? landmark.x - 36 : t(745, 115), y - 10)
  const visitor = actor('visitor', t(100, 55), y - 5)
  const objects = [
    { ...makeObject(pick(['Building', 'Tree'] as const, random), 'vista', t(665, 160), 375), size: t(0.85, 0.45) },
    { ...makeObject('Tree', 'grove', t(80, 95), 394), size: t(0.63, 0.54) },
  ]
  if (selected === 'change') objects.push(landmark, guest, lead, partner, visitor)
  else objects.push(landmark, guest, partner, lead, visitor)
  return {
    version: 2, family: selected, cast, manualMotion: [], manualStyle: [], distance,
    nextEnvironment: pick(environments.filter(preset => preset !== environment), random),
    beats: [
      { phase: 'setup', time: 0, locked: false },
      { phase: 'event', time: t(1.8, 0.7), locked: false },
      { phase: 'outcome', time: t(3.8, 0.8), locked: false, variant: Math.floor(random() * grammar[selected].endings.length) },
    ],
    scene: { version: 1, environment, duration: t(6.5, 1.6), seed, objects },
  }
}

export function anotherStory(story: Story | undefined, seed: number): Story {
  const choices = families.filter(family => family !== story?.family)
  return generateStory(seed, choices[(seed >>> 0) % choices.length])
}

export function hasDirectedCast(story: Story) {
  return Object.values(story.cast).some(id => story.manualMotion.includes(id) ||
    story.scene.objects.some(object => object.id === id && object.locked))
}

export function mutateStory(story: Story, seed: number): Story {
  if (story.beats[2].locked || hasDirectedCast(story)) return story
  const options = grammar[story.family].endings.map((_, index) => index).filter(index => index !== story.beats[2].variant)
  const random = randomFrom(seed)
  random()
  return { ...chooseEnding(story, pick(options, random)), scene: { ...story.scene, seed } }
}

export function chooseEnding(story: Story, variant: number): Story {
  if (story.beats[2].locked || hasDirectedCast(story) || !grammar[story.family].endings[variant] ||
      variant === story.beats[2].variant) return story
  return { ...story, beats: [story.beats[0], story.beats[1], { ...story.beats[2], variant }] }
}

// Colour variation is separate from narrative variation and safe for directed cast.
export function varyStoryScenery(story: Story, seed: number): Story {
  if (story.beats.some(beat => beat.locked)) return story
  const random = randomFrom(seed)
  const objects = story.scene.objects.map(object => ['vista', 'grove'].includes(object.id) &&
      !object.locked && !story.manualStyle.includes(object.id) && !Object.values(story.cast).includes(object.id)
    ? { ...object, color: pick(colors, random) } : object)
  return { ...story, scene: { ...story.scene, seed, objects } }
}

export function setCast(story: Story, role: Role, id: string): Story {
  if (story.beats.some(beat => beat.locked) || hasDirectedCast(story)) return story
  if (Object.values(story.cast).includes(id) ||
      !story.scene.objects.some(object => object.id === id && !object.locked && object.kind === roleKind(story.family, role))) return story
  return { ...story, cast: { ...story.cast, [role]: id } }
}

export function storyRoles() {
  return roles
}

export function compileStory(story: Story): Scene {
  const { cast, scene, family } = story
  const ending = story.beats[2].variant
  const [setup, event, outcome] = story.beats.map(beat => beat.time)
  const objects = new Map(scene.objects.map(object => [object.id, object]))
  const tracks = new Map<Role, Motion[]>()
  const get = (role: Role) => objects.get(cast[role])!
  const queue = (role: Role, action: Motion['action'], start: number, end: number, dx = 0, dy = 0, intensity = 1) => {
    const track = tracks.get(role) ?? []
    track.push({ start, duration: end - start, action, dx, dy, intensity })
    tracks.set(role, track)
  }
  const move = (role: Role, start: number, end: number, x: number, y = get(role).y) => {
    const at = poseAt({ ...get(role), track: tracks.get(role) ?? [] }, start)
    queue(role, 'Move', start, end, x - at.x, y - at.y, 2.4)
  }
  const hide = (role: Role) => queue(role, 'Disappear', -1, 0)
  const show = (role: Role) => queue(role, 'Appear', outcome, outcome + 0.65)
  // A guest added by the outcome uses its first appearance to stay hidden up to that beat.
  const offstage = (role: Role, arrives: boolean) => arrives ? show(role) : hide(role)
  const finish = scene.duration
  if (family !== 'alone') hide('visitor')

  switch (family) {
    case 'meeting': {
      move('lead', setup, event, 457, 435)
      move('partner', setup, event, 503, 435)
      queue('lead', 'Pulse', event, outcome)
      queue('partner', 'Pulse', event, outcome)
      offstage('guest', ending === 4)
      if (ending === 0) {
        move('lead', outcome, finish, 145)
        move('partner', outcome, finish, 830)
      }
      if (ending === 1) {
        move('lead', outcome, finish, 825)
        move('partner', outcome, finish, 875)
      }
      if (ending === 2) queue('partner', 'Disappear', outcome, outcome + 0.9)
      if (ending === 3) {
        move('lead', outcome, finish, 865, 454)
        move('partner', outcome, finish, 103, 425)
      }
      if (ending === 4) move('guest', outcome, finish, 559, 435)
      break
    }
    case 'journey': {
      const target = get('landmark')
      const destination = Math.min(905, target.x + story.distance)
      move('lead', setup, event, Math.max(40, target.x - story.distance))
      move('lead', event, outcome, Math.max(40, target.x - 118))
      queue('landmark', 'Pulse', event, outcome)
      hide('partner')
      offstage('guest', ending === 2)
      move('guest', setup, outcome, Math.max(100, target.x - 36), target.y + 14)
      if (ending === 0) move('lead', outcome, finish, Math.min(920, target.x + 38), target.y + 10)
      if (ending === 1) queue('landmark', 'Disappear', outcome, outcome + 0.85)
      if (ending === 3) move('lead', outcome, finish, get('lead').x)
      if (ending === 4) {
        move('landmark', outcome, finish, destination)
        move('lead', outcome + 0.45, finish, Math.max(40, destination - 48))
      }
      break
    }
    case 'alone':
      move('lead', setup, event, 443, 444)
      move('partner', setup, event, 515, 441)
      move('guest', setup, event, 572, 442)
      move('partner', event, outcome, 687, 435)
      if ([0, 2, 3, 4].includes(ending)) move('partner', outcome, finish, 1000)
      if (ending === 0 || ending === 2) move('guest', outcome, finish, 1000)
      if (ending === 1 || ending === 2) queue('landmark', 'Disappear', outcome, finish)
      offstage('visitor', ending === 3)
      if (ending === 3) move('visitor', outcome, finish, 492, 443)
      if (ending === 4) move('lead', outcome, finish, -40)
      break
    case 'change':
      queue('landmark', 'Scale', event, outcome, 0, 0, 0.65)
      offstage('guest', ending === 1)
      hide('lead')
      hide('partner')
      if (ending === 2) queue('landmark', 'Disappear', outcome, finish)
      if (ending === 3) queue('landmark', 'Scale', outcome, finish, 0, 0, 1)
      break
  }
  const byId = new Map(Object.entries(cast).map(([role, id]) => [id, tracks.get(role as Role) ?? []]))
  return {
    ...scene,
    environmentChange: family === 'change' && ending === 0 ? { time: outcome, to: story.nextEnvironment === scene.environment ? environments.find(preset => preset !== scene.environment)! : story.nextEnvironment } : undefined,
    objects: scene.objects.map(object => {
      const track = byId.get(object.id)
      return track && !story.manualMotion.includes(object.id) ? { ...object, track } : object
    }),
  }
}
