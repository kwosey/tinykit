import { Field, Range } from '../foundation/controls'
import { actions, HEIGHT, WIDTH, type Motion, type SceneObject } from './model'

export function ObjectControls({ object, update, remove, raise }: {
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
      <select aria-label="Action" value={motion.action} onChange={event => setMotion({ action: event.target.value as Motion['action'] })}>
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
