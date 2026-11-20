import type { ReactNode } from 'react'

export function Range({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void
}) {
  return <label className="range">
    <span>{label} <output aria-hidden="true">{Number(value.toFixed(2))}</output></span>
    <input type="range" aria-label={label} value={value} min={min} max={max} step={step}
      onChange={event => onChange(Number(event.target.value))} />
  </label>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function Presets<T extends string>({ name, options, value, onChange }: {
  name: string; options: readonly T[]; value: T; onChange: (value: T) => void
}) {
  return <div className="segments" role="group" aria-label={name}>
    {options.map(option => <button key={option} aria-pressed={option === value} onClick={() => onChange(option)}>{option}</button>)}
  </div>
}
