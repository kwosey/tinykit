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
    case 'scrub': return { time: Math.max(0, Math.min(action.time, duration)), playing: false }
    case 'tick': {
      if (!state.playing) return state
      const time = state.time + Math.max(0, action.delta)
      if (action.loop) return { ...state, time: time % duration }
      return { time: Math.min(time, duration), playing: time < duration }
    }
  }
}
