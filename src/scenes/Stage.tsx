import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { clamp, HEIGHT, WIDTH, updateObject, type Scene } from './model'
import { hitObject, renderScene } from './render'

type Drag = { pointer: number; id: string; startX: number; startY: number; x: number; y: number }

export function Stage({ scene, time, selected, editable, select, pause, move, previewMove }: {
  scene: Scene; time: number; selected?: string; editable: boolean; select: (id?: string) => void
  pause: () => void; move: (id: string, x: number, y: number) => void
  previewMove?: (id: string, x: number, y: number) => Scene
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const frame = preview
      ? previewMove?.(preview.id, preview.x, preview.y) ?? updateObject(scene, preview.id, { x: preview.x, y: preview.y })
      : scene
    renderScene(ctx, frame, time, selected)
  }, [scene, time, selected, preview, previewMove])

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT }
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (!editable || !event.isPrimary || event.button !== 0) return
    const { x, y } = point(event)
    const object = hitObject(scene, x, y, time)
    select(object?.id)
    if (!object) return
    pause()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: event.pointerId, id: object.id, startX: x, startY: y, x: object.x, y: object.y }
  }

  function position(event: PointerEvent<HTMLCanvasElement>, current: Drag) {
    const { x, y } = point(event)
    if (x === current.startX && y === current.startY) return { id: current.id, x: current.x, y: current.y }
    return { id: current.id, x: Math.round(clamp(current.x + x - current.startX, 0, WIDTH)),
      y: Math.round(clamp(current.y + y - current.startY, 0, HEIGHT)) }
  }

  function update(event: PointerEvent<HTMLCanvasElement>) {
    const current = drag.current
    if (current?.pointer === event.pointerId) setPreview(position(event, current))
  }

  function finish(event: PointerEvent<HTMLCanvasElement>, commit: boolean) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    drag.current = null
    setPreview(null)
    if (commit) {
      const { id, x, y } = position(event, current)
      move(id, x, y)
    }
  }

  return <canvas className={editable ? 'editable' : undefined} ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Scene preview" onPointerDown={start}
    onPointerMove={update} onPointerUp={event => finish(event, true)}
    onPointerCancel={event => finish(event, false)} onLostPointerCapture={event => finish(event, false)} />
}
