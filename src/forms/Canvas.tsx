import { useLayoutEffect, useRef, type RefObject } from 'react'
import { HEIGHT, WIDTH } from './effects'
import { parameters, type Composition } from './model'
import { renderComposition } from './render'

export function FormCanvas({ canvas, composition, time }: {
  canvas: RefObject<HTMLCanvasElement | null>; composition: Composition; time: number
}) {
  const latest = useRef({ composition, time })
  const schedule = useRef<() => void>(null)

  useLayoutEffect(() => {
    latest.current = { composition, time }
    schedule.current?.()
  }, [composition, time])

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const context = ctx
    let visual = latest.current.composition
    let lastTime = -1
    let previous = performance.now()
    let frame: number | null = null
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    function requestDraw() {
      if (frame === null) frame = requestAnimationFrame(draw)
    }
    function draw(now: number) {
      frame = null
      const { composition: target, time } = latest.current
      const sameField = visual.effect === target.effect && visual.seed === target.seed &&
        visual.palette === target.palette && visual.shape === target.shape
      const hasTween = sameField && !reduced.matches &&
        parameters.some(key => Math.abs(visual.values[key] - target.values[key]) > 0.08)
      const blend = 1 - Math.exp(-Math.min(32, Math.max(0, now - previous)) / 45)
      const next = hasTween ? {
        ...target, values: Object.fromEntries(parameters.map(key =>
          [key, visual.values[key] + (target.values[key] - visual.values[key]) * blend])) as Composition['values'],
      } : target
      if (next !== visual || time !== lastTime) renderComposition(context, next, time)
      visual = next
      lastTime = time
      previous = now
      if (hasTween) requestDraw()
    }
    schedule.current = requestDraw
    draw(previous)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      schedule.current = null
    }
  }, [canvas])

  return <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Composition canvas" />
}
