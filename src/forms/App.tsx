import { useEffect, useRef, useState } from 'react'
import { playback, type PlaybackAction } from '../foundation/playback'
import { commit, history, redo, undo } from '../foundation/state'
import { downloadBlob } from '../foundation/storage'
import { FormCanvas } from './Canvas'
import { ChoiceStrip } from './ChoiceStrip'
import { decodeComposition, effects, mutate, nextComposition, palettes, parameters, presets, shapes,
  type Composition, type Palette, type Parameter } from './model'
import { keep, readCollection, readDraft, remove, saveDraft } from './storage'
import './forms.css'

const local = () => window.localStorage
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]
const motionAllowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches
const explanations: Record<Parameter, string> = {
  Energy: 'Motion and reach', Order: 'Alignment and regularity', Density: 'Number of marks',
  Tension: 'Pull and spread', Rhythm: 'Timing and pulse', Complexity: 'Layers and detail',
}

export function FormLab() {
  const [timeline, setTimeline] = useState(() => {
    const draft = readDraft(local)
    return history(draft.status === 'ok' ? draft.value : presets[0].value)
  })
  const composition = timeline.current
  const [clock, setClock] = useState(() => ({ time: 0, playing: motionAllowed() }))
  const [loop, setLoop] = useState(true)
  const [collectionOpen, openCollection] = useState(false)
  const [collection, setCollection] = useState(() => readCollection(local))
  const [status, setStatus] = useState('')
  const [draftError, setDraftError] = useState(false)
  const [seed, setSeed] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const drag = useRef<{ key: Parameter; committed: boolean } | null>(null)
  const time = Math.min(clock.time, composition.duration)
  const matchingPreset = presets.find(({ value }) =>
    value.version === composition.version && value.type === composition.type && value.effect === composition.effect &&
    value.shape === composition.shape && value.palette === composition.palette && value.seed === composition.seed &&
    value.duration === composition.duration && parameters.every(key =>
      value.values[key] === composition.values[key] && value.locks[key] === composition.locks[key]))?.name

  useEffect(() => { setDraftError(!saveDraft(local, composition)) }, [composition])
  useEffect(() => {
    const clear = () => { drag.current = null }
    window.addEventListener('pointerup', clear)
    window.addEventListener('pointercancel', clear)
    return () => {
      window.removeEventListener('pointerup', clear)
      window.removeEventListener('pointercancel', clear)
    }
  }, [])
  useEffect(() => {
    if (!clock.playing) return
    let previous = performance.now()
    let frame = 0
    function tick(now: number) {
      const delta = (now - previous) / 1000
      previous = now
      setClock(state => playback(state, { type: 'tick', delta, loop }, composition.duration))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock.playing, composition.duration, loop])

  function control(action: PlaybackAction) {
    setClock(current => playback(current, action, composition.duration))
  }

  function useComposition(value: Composition, restart = false) {
    setTimeline(current => commit(current, value))
    if (restart) setClock(current => ({ ...current, time: 0 }))
  }

  function tune(key: Parameter, value: number) {
    const coalesce = drag.current?.key === key && drag.current.committed
    if (drag.current?.key === key) drag.current.committed = true
    setTimeline(current => {
      if (current.current.values[key] === value) return current
      const next = { ...current.current, values: { ...current.current.values, [key]: value } }
      return coalesce ? { ...current, current: next, future: [] } : commit(current, next)
    })
  }

  function explore(another: boolean) {
    const value = seed === '' ? randomSeed() : Number(seed)
    if (seed !== '' && (!/^\d+$/.test(seed) || value > 4294967295)) {
      setStatus('Enter a seed between 0 and 4294967295.')
      return
    }
    const next = another ? nextComposition(composition, value) : mutate(composition, value)
    if (next === composition) {
      setStatus('Unlock a parameter to mutate this composition.')
      return
    }
    useComposition(next, another)
    setStatus(another ? next.effect + ' composition opened.' : 'Variation applied.')
  }

  function saveToCollection() {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('')
    const result = keep(local, composition, id, Date.now())
    setCollection(readCollection(local))
    setStatus(result === 'kept' ? 'Kept in Collection.' : result === 'duplicate'
      ? 'This composition is already in Collection.' : 'Could not keep this composition. Export JSON to save it.')
  }

  async function importFile(input: HTMLInputElement) {
    const selected = input.files?.[0]
    input.value = ''
    if (!selected) return
    try {
      const value = selected.size < 100_000 && decodeComposition(await selected.text())
      if (!value) throw new Error('Invalid composition')
      useComposition(value, true)
      setStatus('Composition imported.')
    } catch { setStatus('Invalid Form Lab JSON. Your composition is still open.') }
  }

  function exportFrame() {
    canvas.current?.toBlob(blob => {
      if (blob) downloadBlob(blob, 'form-lab.png')
      else setStatus('Could not export the current frame.')
    }, 'image/png')
  }

  return <main className="form-lab">
    <div className="form-heading">
      <div>
        <h1>Form Lab</h1>
        <p>{matchingPreset ?? 'Custom'} <span>· {composition.effect}</span></p>
      </div>
      <button aria-expanded={collectionOpen} onClick={() => {
        setCollection(readCollection(local))
        openCollection(!collectionOpen)
      }}>Collection{collection.entries.length ? ' · ' + collection.entries.length : ''}</button>
    </div>
    {collectionOpen && <section className="form-panel form-collection" aria-label="Collection">
      <h2>Kept compositions</h2>
      {!collection.entries.length && <p>Use Keep to save a composition here.</p>}
      {collection.entries.map(entry => <div className="form-collection-row" key={entry.id}>
        <span>{entry.value.effect} <small>{entry.value.palette} · {entry.value.seed}</small></span>
        <div className="row">
          <button aria-label={'Open ' + entry.value.effect} onClick={() => {
            useComposition(entry.value, true)
            openCollection(false)
            setStatus('Kept composition opened.')
          }}>Open</button>
          <button aria-label={'Delete ' + entry.value.effect} onClick={() => {
            setStatus(remove(local, entry.id) ? 'Removed from Collection.' : 'Could not remove this composition.')
            setCollection(readCollection(local))
          }}>Delete</button>
        </div>
      </div>)}
      {!!collection.damaged && <p>{collection.damaged} unreadable entries were preserved.</p>}
      {collection.unavailable && <p>Collection storage is unavailable.</p>}
    </section>}
    <div className="form-workspace">
      <section aria-label="Composition and playback">
        <div className="form-screen"><FormCanvas canvas={canvas} composition={composition} time={time} /></div>
        <div className="form-transport form-panel">
          <div className="form-actions">
            <button className="form-primary" onClick={() => control({ type: clock.playing ? 'pause' : 'play' })}>
              {clock.playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => explore(true)}>Next Composition</button>
            <button onClick={() => explore(false)}>Mutate</button>
            <button onClick={saveToCollection}>Keep</button>
          </div>
          <input type="range" aria-label="Scrub" min={0} max={composition.duration} step={0.01} value={time}
            onChange={event => control({ type: 'scrub', time: Number(event.target.value) })} />
          <div className="row form-meta">
            <button onClick={() => control({ type: 'restart' })}>Restart</button>
            <label><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} /> Loop</label>
            <span aria-label="Time">{time.toFixed(2)} / {composition.duration.toFixed(1)} s</span>
          </div>
        </div>
        <div className="row form-history">
          <button disabled={!timeline.past.length} onClick={() => setTimeline(undo)}>Undo</button>
          <button disabled={!timeline.future.length} onClick={() => setTimeline(redo)}>Redo</button>
          <span role="status">{status}</span>
        </div>
        {draftError && <p className="form-note">Autosave is unavailable. Any unreadable draft is preserved. Export JSON to keep your changes.</p>}
      </section>
      <aside aria-label="Composition controls">
        <section className="form-panel form-controls">
          <h2>Parameters</h2>
          {parameters.map(key => <div className="form-control" key={key}>
            <label>
              <span>{key}<span className="form-value">{composition.values[key]}</span></span>
              <input aria-label={key} type="range" min={0} max={100} value={composition.values[key]}
                title={explanations[key]} onPointerDown={() => { drag.current = { key, committed: false } }}
                onChange={event => tune(key, Number(event.target.value))} />
            </label>
            <button className="form-lock" aria-label={'Lock ' + key} aria-pressed={composition.locks[key]}
              title={composition.locks[key] ? 'Unlock ' + key : 'Lock ' + key}
              onClick={() => useComposition({ ...composition, locks: { ...composition.locks, [key]: !composition.locks[key] } })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d={composition.locks[key] ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 8-1'} />
              </svg>
            </button>
          </div>)}
        </section>
        <details className="form-panel form-settings">
          <summary>More settings</summary>
          <ChoiceStrip label="Starting composition" options={presets.map(preset => preset.name)}
            selected={matchingPreset} custom onSelect={name => {
              const preset = presets.find(item => item.name === name)
              if (preset) useComposition(preset.value, true)
            }} />
          <ChoiceStrip label="Effect" options={effects} selected={composition.effect}
            onSelect={effect => { if (effect !== composition.effect) useComposition({ ...composition, effect }, true) }} />
          <ChoiceStrip label="Shape" options={shapes} selected={composition.shape}
            onSelect={shape => { if (shape !== composition.shape) useComposition({ ...composition, shape }) }} />
          <ChoiceStrip label="Palette" options={Object.keys(palettes) as Palette[]} selected={composition.palette}
            onSelect={palette => { if (palette !== composition.palette) useComposition({ ...composition, palette }) }} />
          <label>Duration · {composition.duration} s
            <input aria-label="Duration" type="range" min={4} max={30} value={composition.duration}
              onChange={event => useComposition({ ...composition, duration: Number(event.target.value) })} />
          </label>
          <label>Variation seed
            <input aria-label="Variation seed" value={seed} placeholder="Random" inputMode="numeric"
              onChange={event => setSeed(event.target.value)} />
          </label>
          <div className="row">
            <button onClick={() => file.current?.click()}>Import JSON</button>
            <button onClick={() => downloadBlob(new Blob([JSON.stringify(composition, null, 2)], { type: 'application/json' }), 'form-lab.json')}>Export JSON</button>
            <button onClick={exportFrame}>Export PNG</button>
          </div>
          <input ref={file} type="file" accept=".json,application/json" aria-label="Import composition file"
            hidden onChange={event => void importFile(event.currentTarget)} />
        </details>
      </aside>
    </div>
  </main>
}
