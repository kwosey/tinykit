import { useEffect, useMemo, useRef, useState } from 'react'
import { Field, Presets, Range } from '../foundation/controls'
import { commit, history, redo, undo } from '../foundation/state'
import { downloadBlob } from '../foundation/storage'
import {
  addObject, deleteObject, environments, HEIGHT, kinds, raiseObject,
  updateObject, varyScene, WIDTH, type Kind, type Scene, type SceneObject,
} from './model'
import { playback, type PlaybackAction } from './motion'
import { renderScene } from './render'
import { Stage } from './Stage'
import { ObjectControls } from './ObjectControls'
import { anotherStory, compileStory, generateStory, grammar, mutateStory, setCast, varyStoryScenery } from '../stories/grammar'
import { DirectBeat, StoryBeats } from '../stories/StoryBeats'
import {
  activeScene, decodeDocument, deleteKept, keepDocument, listKept, oldScenes, readOldScene,
  recoverDraft, saveDraft, type Document,
} from '../stories/storage'

const storage = () => window.localStorage
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]
const id = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('')
const title = (document: Document) => document.version === 2 ? grammar[document.family].title : 'Free scene'

export function App() {
  const [recovered] = useState(() => recoverDraft(storage))
  const [timeline, setTimeline] = useState(() => history<Document>(recovered.document ?? generateStory(randomSeed())))
  const document = timeline.current
  const story = document.version === 2 ? document : undefined
  const base = activeScene(document)
  const scene = useMemo(() => story ? compileStory(story) : base, [story, base])
  const [editing, setEditing] = useState(document.version === 1)
  const [showLibrary, setShowLibrary] = useState(false)
  const [library, setLibrary] = useState(() => listKept(storage))
  const [selected, select] = useState<string>()
  const object = base.objects.find(candidate => candidate.id === selected)
  const [kind, setKind] = useState<Kind>('Person')
  const [beatIndex, chooseBeat] = useState(2)
  const [seed, setSeed] = useState<string | null>(null)
  const [clock, setClock] = useState({ time: 0, playing: false })
  const [loop, setLoop] = useState(true)
  const [message, setMessage] = useState('')
  const [draftFailed, setDraftFailed] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const time = Math.min(clock.time, scene.duration)

  useEffect(() => { setDraftFailed(!saveDraft(storage, document)) }, [document])

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

  function change(next: Document) {
    setTimeline(current => commit(current, next))
  }

  function editScene(update: (scene: Scene) => Scene) {
    const next = update(base)
    if (next !== base) change(story ? { ...story, scene: next } : next)
  }

  function editObject(objectId: string, patch: Partial<Omit<SceneObject, 'id'>>) {
    const next = updateObject(base, objectId, patch)
    if (next === base) return
    if (!story) {
      change(next)
      return
    }
    change({
      ...story, scene: next,
      manualMotion: patch.motion ? [...new Set([...story.manualMotion, objectId])] : story.manualMotion,
      manualStyle: patch.color ? [...new Set([...story.manualStyle, objectId])] : story.manualStyle,
    })
  }

  function removeObject(objectId: string) {
    if (story && Object.values(story.cast).includes(objectId)) {
      setMessage('This object has a story role. Reassign the role before deleting it.')
      return
    }
    const next = deleteObject(base, objectId)
    change(story ? {
      ...story, scene: next,
      manualMotion: story.manualMotion.filter(item => item !== objectId),
      manualStyle: story.manualStyle.filter(item => item !== objectId),
    } : next)
  }

  function control(action: PlaybackAction) {
    setClock(current => playback(current, action, scene.duration))
  }

  function open(next: Document, autoplay = false) {
    change(next)
    setEditing(next.version === 1)
    setSeed(null)
    select(undefined)
    setClock({ time: 0, playing: autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
  }

  function stepHistory(direction: 'undo' | 'redo') {
    const next = direction === 'undo' ? undo(timeline) : redo(timeline)
    if (next === timeline) return
    setTimeline(next)
    if (next.current.version !== document.version) setEditing(next.current.version === 1)
    setClock({ time: 0, playing: false })
    setSeed(null)
    setMessage('')
  }

  function getSeed() {
    if (seed === null) return randomSeed()
    const value = Number(seed)
    if (!/^\d+$/.test(seed) || !Number.isInteger(value) || value > 4294967295) {
      setMessage('Enter a seed between 0 and 4294967295.')
      return undefined
    }
    return value
  }

  function generate() {
    const value = getSeed()
    if (value === undefined) return
    open(anotherStory(story, value), true)
    setMessage('')
  }

  function vary(mode: 'story' | 'scenery' | 'shuffle') {
    const value = getSeed()
    if (value === undefined) return
    const next = story
      ? mode === 'scenery' ? varyStoryScenery(story, value) : mutateStory(story, value)
      : varyScene(base, value, mode === 'shuffle')
    if (next === document) {
      setMessage(mode === 'scenery' ? 'Unlock all beats to vary scenery.' :
        story?.beats[2].locked ? 'Unlock Outcome to discover other endings.' :
          'Locked cast objects or manual cast motion protect this ending. Unlock the cast and restore story motion to vary it.')
      return
    }
    change(next)
    if (story && mode === 'story') {
      setClock({ time: 0, playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    }
    setMessage(mode === 'story' && story ? 'New ending' : 'Scene varied')
  }

  function keep() {
    const result = keepDocument(storage, document, id(), Date.now())
    setLibrary(listKept(storage))
    setMessage(result === 'kept' ? 'Added to your collection.' : result === 'duplicate'
      ? 'This exact version is already in your collection.' : 'Could not keep this version. Export JSON to save it.')
  }

  function restorePrevious(name: keyof typeof oldScenes) {
    const previous = readOldScene(storage, name)
    if (previous.status === 'ok') {
      open(previous.value)
      setShowLibrary(false)
      setMessage('Opened ' + name + ' in the free editor.')
    } else setMessage(previous.status === 'empty' ? 'No ' + name + ' found.' : 'Could not open the ' + name + '. Its data is protected.')
  }

  async function importJson(input: HTMLInputElement) {
    const selectedFile = input.files?.[0]
    input.value = ''
    if (!selectedFile) return
    try {
      const imported = selectedFile.size <= 1_000_000 && decodeDocument(await selectedFile.text())
      if (!imported) throw new Error('Invalid document')
      open(imported)
      setMessage(imported.version === 2 ? 'Story imported' : 'Opened scene in the free editor.')
    } catch {
      setMessage('Could not import that JSON file. The current scene is still open.')
    }
  }

  function exportPng() {
    const canvas = window.document.createElement('canvas')
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

  function add() {
    const objectId = id()
    editScene(current => addObject(current, kind, objectId))
    select(objectId)
  }

  return <main>
    <header>
      <div className="brand"><span className="mark" aria-hidden="true">✦</span><h1>Tiny Scenes</h1></div>
      <div className="file-actions">
        <button aria-expanded={showLibrary} onClick={() => { setLibrary(listKept(storage)); setShowLibrary(!showLibrary) }}>
          Collection{library.entries.length ? ' · ' + library.entries.length : ''}
        </button>
        <button aria-expanded={editing} onClick={() => { setEditing(!editing); control({ type: 'pause' }) }}>{editing ? 'Done editing' : 'Edit'}</button>
        <input ref={file} type="file" accept=".json,application/json" aria-label="Import scene file" hidden onChange={event => void importJson(event.currentTarget)} />
      </div>
    </header>
    {showLibrary && <section className="panel library" aria-label="Collection">
      <h2>Collection</h2>
      {!library.entries.length && <p className="help">Use Keep to save a version here.</p>}
      {library.entries.map(entry => <div className="library-item" key={entry.id}>
        <div><strong>{title(entry.document)}</strong><span>{entry.document.version === 2
          ? grammar[entry.document.family].endings[entry.document.beats[2].variant] : activeScene(entry.document).environment}</span></div>
        <div className="row">
          <button aria-label={'Open ' + title(entry.document)} onClick={() => { open(entry.document); setShowLibrary(false); setMessage('Kept version opened.') }}>Open</button>
          <button aria-label={'Delete ' + title(entry.document)} onClick={() => {
            const removed = deleteKept(storage, entry.id)
            setLibrary(listKept(storage))
            setMessage(removed ? 'Removed from collection.' : 'Could not remove this version.')
          }}>Delete</button>
        </div>
      </div>)}
      {!!library.invalid && <p className="help">{library.invalid} unreadable collection entries were preserved.</p>}
      {library.unavailable && <p className="help">Collection storage is unavailable.</p>}
      <div className="row">
        {(Object.keys(oldScenes) as (keyof typeof oldScenes)[]).map(name =>
          <button key={name} onClick={() => restorePrevious(name)}>Open {name}</button>)}
      </div>
    </section>}
    <div className="title">
      <h2>{title(document)}</h2>
      <span className="time">{base.environment} · {scene.duration.toFixed(1)} s</span>
    </div>
    <div className={editing ? 'workspace' : 'workspace discovery'}>
      <section className="stage-panel" aria-label="Stage and playback">
        <Stage scene={scene} time={time} selected={editing ? object?.id : undefined} editable={editing} select={select}
          previewMove={story && ((objectId, x, y) => compileStory({ ...story, scene: updateObject(base, objectId, { x, y }) }))}
          pause={() => control({ type: 'pause' })} move={(objectId, x, y) => editObject(objectId, { x, y })} />
        <div className="playback">
          <div className="row story-actions">
            <button className="accent" onClick={() => control({ type: clock.playing ? 'pause' : 'play' })}>{clock.playing ? 'Pause' : 'Play'}</button>
            <button onClick={generate}>Another Story</button>
            <button onClick={() => vary('story')}>Mutate</button>
            <button onClick={keep}>Keep</button>
          </div>
          <label className="scrub">
            <span className="sr-only">Scrub</span>
            <input type="range" min="0" max={scene.duration} step="0.01" value={time}
              onChange={event => control({ type: 'scrub', time: Number(event.target.value) })} />
          </label>
          <div className="row playback-options">
            <button onClick={() => control({ type: 'restart' })}>Restart</button>
            <label className="loop"><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} /> Loop</label>
            <span className="time">{time.toFixed(2)} / {scene.duration.toFixed(1)} s</span>
          </div>
        </div>
        {story && <StoryBeats story={story} time={time} change={change} seek={target => control({ type: 'scrub', time: target })} />}
        <div className="stage-footer">
          <div className="row">
            <button disabled={!timeline.past.length} onClick={() => stepHistory('undo')}>Undo</button>
            <button disabled={!timeline.future.length} onClick={() => stepHistory('redo')}>Redo</button>
          </div>
          <p role="status">{message}</p>
        </div>
        {recovered.warning && <p className="help">{recovered.warning}</p>}
        {draftFailed && <p className="help">Autosave is unavailable. Export JSON to keep edits.</p>}
      </section>
      {editing && <aside aria-label="Scene tools">
        {story && <DirectBeat story={story} index={beatIndex} choose={chooseBeat} change={change}
          assign={(role, objectId) => {
            const next = setCast(story, role, objectId)
            if (next === story) setMessage('This object cannot take that role.')
            else { change(next); select(objectId); setMessage('Cast updated.') }
          }} />}
        <section className="panel">
          <h2>Environment</h2>
          <Presets name="Environment presets" options={environments} value={base.environment}
            onChange={environment => editScene(current => current.environment === environment ? current : { ...current, environment })} />
          <Range label="Scene length (s)" min={story ? Math.ceil((story.beats[2].time + 1) * 10) / 10 : 2} max={10} step={0.1} value={scene.duration}
            onChange={duration => editScene(current => ({ ...current, duration }))} />
        </section>
        <section className="panel">
          <div className="section-heading"><h2>Objects</h2><span>{base.objects.length}</span></div>
          <div className="row">
            <select aria-label="Object type" value={kind} onChange={event => setKind(event.target.value as Kind)}>
              {kinds.map(item => <option key={item}>{item}</option>)}
            </select>
            <button disabled={base.objects.length >= 200} onClick={add}>Add object</button>
          </div>
          <select aria-label="Selected object" value={object?.id ?? ''} onChange={event => select(event.target.value || undefined)}>
            <option value="">Select an object</option>
            {base.objects.map((item, index) => <option key={item.id} value={item.id}>{item.kind} {index + 1}{item.locked ? ' · Locked' : ''}</option>)}
          </select>
          {object && <>
            {story && Object.values(story.cast).includes(object.id) && <p className="help">{story.manualMotion.includes(object.id)
              ? 'Manual action overrides story motion for this object.' : 'This cast member follows the story. Pick an action to direct it manually.'}</p>}
            {story?.manualMotion.includes(object.id) && <button onClick={() => change({
              ...story, manualMotion: story.manualMotion.filter(item => item !== object.id),
              scene: updateObject(base, object.id, { motion: { action: 'Still', start: 0, duration: 4, intensity: 1, dx: 160, dy: 0 } }),
            })}>Restore story motion</button>}
            <ObjectControls object={object} update={patch => editObject(object.id, patch)}
              remove={() => removeObject(object.id)} raise={() => editScene(current => raiseObject(current, object.id))} />
          </>}
        </section>
        <section className="panel">
          <h2>Explore</h2>
          <Field label="Variation seed"><input value={seed ?? ''} placeholder={String(base.seed)} inputMode="numeric"
            onChange={event => setSeed(event.target.value === '' ? null : event.target.value)} /></Field>
          <button onClick={() => vary(story ? 'scenery' : 'shuffle')}>{story ? 'Vary scenery' : 'Shuffle'}</button>
        </section>
        <section className="panel">
          <h2>Files</h2>
          <div className="row">
            <button onClick={() => file.current?.click()}>Import JSON</button>
            <button onClick={() => downloadBlob(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }), 'tiny-scene.json')}>Export JSON</button>
            <button onClick={exportPng}>Export PNG</button>
          </div>
        </section>
      </aside>}
    </div>
  </main>
}
