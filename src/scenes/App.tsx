import { useEffect, useRef, useState } from 'react'
import { Field, Presets, Range } from '../foundation/controls'
import { commit, history, redo, undo } from '../foundation/state'
import { downloadBlob, readLocal, writeLocal } from '../foundation/storage'
import {
  actions, addObject, deleteObject, environments, HEIGHT, initialScene, kinds, raiseObject,
  updateObject, varyScene, WIDTH, type Kind, type Motion, type Scene, type SceneObject,
} from './model'
import { playback, type PlaybackAction } from './motion'
import { decodeScene, DRAFT_KEY, SAVED_KEY } from './persistence'
import { renderScene } from './render'
import { Stage } from './Stage'

const storage = () => window.localStorage
const unreadable = (status: string) => status === 'invalid' || status === 'unavailable'

export function App() {
  const [draft] = useState(() => readLocal(storage, DRAFT_KEY, decodeScene))
  const [timeline, setTimeline] = useState(() => history(draft.status === 'ok' ? draft.value : initialScene))
  const scene = timeline.current
  const [selected, select] = useState<string | undefined>('person')
  const object = scene.objects.find(candidate => candidate.id === selected)
  const [kind, setKind] = useState<Kind>('Person')
  const [seed, setSeed] = useState(String(scene.seed))
  const [clock, setClock] = useState({ time: 0, playing: false })
  const [loop, setLoop] = useState(true)
  const [message, setMessage] = useState(unreadable(draft.status)
    ? 'Draft could not be read. Its data is protected. Export JSON to keep new edits.' : '')
  const file = useRef<HTMLInputElement>(null)
  const time = Math.min(clock.time, scene.duration)

  useEffect(() => {
    if (unreadable(draft.status)) return
    if (!writeLocal(storage, DRAFT_KEY, scene)) setMessage('Autosave is unavailable. Export JSON to keep your edits.')
  }, [scene, draft])

  useEffect(() => {
    if (!clock.playing) return
    let previous = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const delta = (now - previous) / 1000
      previous = now
      setClock(current => playback(current, { type: 'tick', delta, loop }, scene.duration))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock.playing, scene.duration, loop])

  function edit(update: (current: Scene) => Scene) {
    setTimeline(current => commit(current, update(current.current)))
  }

  function control(action: PlaybackAction) {
    setClock(current => playback(current, action, scene.duration))
  }

  function add() {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('')
    edit(current => addObject(current, kind, id))
    select(id)
  }

  function vary(shuffle: boolean) {
    const value = Number(seed)
    if (!/^\d+$/.test(seed) || !Number.isInteger(value) || value > 4294967295) {
      setMessage('Enter a seed between 0 and 4294967295.')
      return
    }
    edit(current => varyScene(current, value, shuffle))
    setSeed(String((value + 1) >>> 0))
    setMessage(shuffle ? 'Scene shuffled' : 'Scene mutated')
  }

  function save() {
    const saved = readLocal(storage, SAVED_KEY, decodeScene)
    if (unreadable(saved.status)) {
      setMessage('The previous save is unreadable and protected. Export JSON to keep this scene.')
      return
    }
    setMessage(writeLocal(storage, SAVED_KEY, scene) ? 'Scene saved' : 'Save failed. Export JSON to keep this scene.')
  }

  function restore() {
    const saved = readLocal(storage, SAVED_KEY, decodeScene)
    if (saved.status === 'ok') {
      edit(() => saved.value)
      control({ type: 'scrub', time: 0 })
      setMessage('Saved scene restored')
    } else {
      setMessage(saved.status === 'empty' ? 'No saved scene yet.' : 'Saved scene could not be read. Current scene kept.')
    }
  }

  async function importJson(input: HTMLInputElement) {
    const selectedFile = input.files?.[0]
    input.value = ''
    if (!selectedFile) return
    try {
      if (selectedFile.size > 256_000) throw new Error('File too large')
      const imported = decodeScene(await selectedFile.text())
      if (!imported) throw new Error('Invalid scene')
      edit(() => imported)
      control({ type: 'scrub', time: 0 })
      setMessage('Scene imported')
    } catch {
      setMessage('Could not import that Tiny Scenes JSON file. Current scene kept.')
    }
  }

  function exportPng() {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderScene(ctx, scene, time)
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, 'tiny-scene.png')
      else setMessage('PNG export failed.')
    }, 'image/png')
  }

  return <main>
    <header>
      <div className="brand"><span className="mark" aria-hidden="true">✦</span><span>Tiny Kit</span></div>
      <div className="file-actions">
        <button onClick={save}>Save</button>
        <button onClick={restore}>Restore</button>
        <button onClick={() => file.current?.click()}>Import JSON</button>
        <button onClick={() => downloadBlob(new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' }), 'tiny-scene.json')}>Export JSON</button>
        <input ref={file} type="file" accept=".json,application/json" aria-label="Import scene file" hidden onChange={event => void importJson(event.currentTarget)} />
      </div>
    </header>
    <div className="title">
      <h1>Tiny Scenes</h1>
      <button className="accent" onClick={exportPng}>Export PNG</button>
    </div>
    <div className="workspace">
      <section className="stage-panel" aria-label="Stage and playback">
        <Stage scene={scene} time={time} selected={object?.id} select={select}
          pause={() => control({ type: 'pause' })}
          move={(id, x, y) => edit(current => updateObject(current, id, { x, y }))} />
        <div className="playback">
          <div className="row">
            <button className="accent" onClick={() => control({ type: clock.playing ? 'pause' : 'play' })}>
              {clock.playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => control({ type: 'restart' })}>Restart</button>
            <label className="loop"><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} /> Loop</label>
            <span className="time">{time.toFixed(2)} / {scene.duration.toFixed(1)} s</span>
          </div>
          <label className="scrub">
            <span className="sr-only">Scrub</span>
            <input type="range" min="0" max={scene.duration} step="0.01" value={time}
              onChange={event => control({ type: 'scrub', time: Number(event.target.value) })} />
          </label>
        </div>
        <div className="stage-footer">
          <div className="row">
            <button disabled={!timeline.past.length} onClick={() => setTimeline(undo)}>Undo</button>
            <button disabled={!timeline.future.length} onClick={() => setTimeline(redo)}>Redo</button>
          </div>
          <p role="status">{message}</p>
        </div>
      </section>
      <aside aria-label="Scene tools">
        <section className="panel">
          <h2>Environment</h2>
          <Presets name="Environment presets" options={environments} value={scene.environment}
            onChange={environment => edit(current => current.environment === environment ? current : { ...current, environment })} />
          <Range label="Scene length (s)" min={2} max={10} step={0.5} value={scene.duration}
            onChange={duration => edit(current => ({ ...current, duration }))} />
        </section>
        <section className="panel">
          <div className="section-heading"><h2>Objects</h2><span>{scene.objects.length}</span></div>
          <div className="row">
            <select aria-label="Object type" value={kind} onChange={event => setKind(event.target.value as Kind)}>
              {kinds.map(item => <option key={item}>{item}</option>)}
            </select>
            <button disabled={scene.objects.length >= 200} onClick={add}>Add object</button>
          </div>
          <select aria-label="Selected object" value={object?.id ?? ''} onChange={event => select(event.target.value || undefined)}>
            <option value="">Select an object</option>
            {scene.objects.map((item, index) => <option key={item.id} value={item.id}>{item.kind} {index + 1}{item.locked ? ' · Locked' : ''}</option>)}
          </select>
          {object && <ObjectControls object={object}
            update={patch => edit(current => updateObject(current, object.id, patch))}
            remove={() => edit(current => deleteObject(current, object.id))}
            raise={() => edit(current => raiseObject(current, object.id))} />}
        </section>
        <section className="panel">
          <h2>Explore</h2>
          <Field label="Seed"><input value={seed} inputMode="numeric" onChange={event => setSeed(event.target.value)} /></Field>
          <div className="row">
            <button onClick={() => vary(false)}>Mutate</button>
            <button onClick={() => vary(true)}>Shuffle</button>
          </div>
        </section>
      </aside>
    </div>
  </main>
}

function ObjectControls({ object, update, remove, raise }: {
  object: SceneObject
  update: (patch: Partial<Omit<SceneObject, 'id'>>) => void
  remove: () => void
  raise: () => void
}) {
  const motion = object.motion
  const setMotion = (patch: Partial<Motion>) => update({ motion: { ...motion, ...patch } })
  return <>
    <div className="row object-buttons">
      <button aria-pressed={object.locked} onClick={() => update({ locked: !object.locked })}>{object.locked ? 'Unlock' : 'Lock'}</button>
      <button onClick={raise}>Bring to front</button>
      <button onClick={remove}>Delete</button>
    </div>
    {object.kind === 'Text' && <Field label="Text">
      <input value={object.text} maxLength={48} onChange={event => update({ text: event.target.value })} />
    </Field>}
    <div className="two">
      <Range label="X position" min={0} max={WIDTH} value={object.x} onChange={x => update({ x })} />
      <Range label="Y position" min={0} max={HEIGHT} value={object.y} onChange={y => update({ y })} />
    </div>
    <div className="two">
      <Range label="Size" min={0.25} max={3} step={0.01} value={object.size} onChange={size => update({ size })} />
      <Field label="Color"><input type="color" value={object.color} onChange={event => update({ color: event.target.value })} /></Field>
    </div>
    <Field label="Action">
      <select value={motion.action} onChange={event => setMotion({ action: event.target.value as Motion['action'] })}>
        {actions.map(action => <option key={action}>{action}</option>)}
      </select>
    </Field>
    {motion.action !== 'Still' && <div className="two">
      <Range label="Start (s)" min={0} max={10} step={0.1} value={motion.start} onChange={start => setMotion({ start })} />
      <Range label="Duration (s)" min={0.1} max={10} step={0.1} value={motion.duration} onChange={duration => setMotion({ duration })} />
      {!['Appear', 'Disappear'].includes(motion.action) && (motion.action !== 'Move' || object.kind === 'Person') &&
        <Range label={motion.action === 'Move' ? 'Stride speed' : 'Intensity'} min={0.1} max={3} step={0.1}
          value={motion.intensity} onChange={intensity => setMotion({ intensity })} />}
      {motion.action === 'Move' && <>
        <Range label="Move X" min={-WIDTH} max={WIDTH} value={motion.dx} onChange={dx => setMotion({ dx })} />
        <Range label="Move Y" min={-HEIGHT} max={HEIGHT} value={motion.dy} onChange={dy => setMotion({ dy })} />
      </>}
    </div>}
  </>
}
