export function randomFrom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export interface History<T> {
  past: T[]
  current: T
  future: T[]
}

export function history<T>(current: T): History<T> {
  return { past: [], current, future: [] }
}

export function commit<T>(state: History<T>, current: T): History<T> {
  if (state.current === current) return state
  return { past: [...state.past.slice(-49), state.current], current, future: [] }
}

export function undo<T>(state: History<T>): History<T> {
  if (!state.past.length) return state
  return { past: state.past.slice(0, -1), current: state.past[state.past.length - 1], future: [state.current, ...state.future] }
}

export function redo<T>(state: History<T>): History<T> {
  if (!state.future.length) return state
  return { past: [...state.past, state.current], current: state.future[0], future: state.future.slice(1) }
}
