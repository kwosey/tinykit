import { useId, useLayoutEffect, useRef } from 'react'

export function ChoiceStrip<T extends string>({ label, options, selected, onSelect, custom }: {
  label: string
  options: readonly T[]
  selected?: T
  onSelect: (option: T) => void
  custom?: boolean
}) {
  const labelId = useId()
  const strip = useRef<HTMLDivElement>(null)
  const active = useRef<HTMLButtonElement>(null)
  const touch = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const row = strip.current
    const item = active.current
    if (!row || !item) return
    const reveal = () => {
      if (!row.clientWidth) return
      const bounds = row.getBoundingClientRect()
      const choice = item.getBoundingClientRect()
      if (choice.left < bounds.left + 4) row.scrollLeft += choice.left - bounds.left - 4
      else if (choice.right > bounds.right - 4) row.scrollLeft += choice.right - bounds.right + 4
    }
    reveal()
    // A closed details element has no layout. Reveal the active item when it opens.
    const observer = new ResizeObserver(reveal)
    observer.observe(row)
    return () => observer.disconnect()
  }, [selected])

  return <div className="form-choices">
    <div className="form-choice-label"><span id={labelId}>{label}</span>
      {custom && !selected && <span className="form-custom">Custom</span>}
    </div>
    <div className="form-choice-strip" role="group" aria-labelledby={labelId} ref={strip}
      onPointerDown={event => {
        touch.current = event.pointerType === 'touch'
          ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null
      }}
      onPointerMove={event => {
        const gesture = touch.current
        if (gesture?.id === event.pointerId &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8) gesture.moved = true
      }}
      onPointerCancel={event => {
        if (touch.current?.id === event.pointerId) touch.current.moved = true
      }}
      onClickCapture={event => {
        if (event.detail !== 0 && touch.current?.moved) event.stopPropagation()
      }}>
      {options.map(option => <button key={option} type="button" ref={option === selected ? active : undefined}
        aria-pressed={option === selected} onClick={() => onSelect(option)}>{option}</button>)}
    </div>
  </div>
}
