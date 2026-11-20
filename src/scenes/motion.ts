import { clamp, type SceneObject } from './model'

export function poseAt(object: SceneObject, time: number) {
  const { action, start, duration, intensity, dx, dy } = object.motion
  const progress = clamp((time - start) / duration, 0, 1)
  const wave = Math.sin(progress * Math.PI * 2 * intensity)
  const envelope = progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) : 0
  return {
    x: object.x + (action === 'Move' ? progress * dx : 0),
    y: object.y + (action === 'Move' ? progress * dy : 0) - (action === 'Float' ? wave * envelope * 28 : 0),
    size: object.size * (action === 'Scale' ? 1 + progress * intensity / 2 : action === 'Pulse' ? 1 + wave * envelope * intensity * 0.15 : 1),
    opacity: action === 'Appear' ? progress : action === 'Disappear' ? 1 - progress : 1,
    rotation: action === 'Rotate' ? progress * Math.PI * 2 * intensity : 0,
    stride: action === 'Move' ? wave * envelope : 0,
  }
}

export interface Playback { time: number; playing: boolean }
export type PlaybackAction =
  | { type: 'play' | 'pause' | 'restart' }
  | { type: 'scrub'; time: number }
  | { type: 'tick'; delta: number; loop: boolean }

export function playback(state: Playback, action: PlaybackAction, duration: number): Playback {
  switch (action.type) {
    case 'play': return { time: state.time >= duration ? 0 : state.time, playing: true }
    case 'pause': return { ...state, playing: false }
    case 'restart': return { ...state, time: 0 }
    case 'scrub': return { time: clamp(action.time, 0, duration), playing: false }
    case 'tick': {
      if (!state.playing) return state
      const time = state.time + Math.max(0, action.delta)
      if (action.loop) return { ...state, time: time % duration }
      return { time: Math.min(time, duration), playing: time < duration }
    }
  }
}
