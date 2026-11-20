import { Field, Range } from '../foundation/controls'
import { beatRoles, beatTitle, canRetime, chooseEnding, grammar, hasDirectedCast, lockBeat, phases, retimeBeat, roleKind, type Role, type Story } from './grammar'

export function StoryBeats({ story, time, seek, change }: {
  story: Story; time: number; seek: (time: number) => void; change: (story: Story) => void
}) {
  const active = story.beats.findLastIndex(beat => beat.time <= time)
  return <ol className="beats" aria-label="Story beats">
    {story.beats.map((beat, index) => <li key={phases[index]} className={active === index ? 'active' : ''}>
      <button className="beat-seek" onClick={() => seek(beat.time)} aria-current={active === index ? 'step' : undefined}>
        <span>{phases[index]} <small>{beat.time.toFixed(1)} s</small></span>
        <strong>{beatTitle(story, index)}</strong>
      </button>
      <button className="beat-lock" aria-label={'Lock ' + phases[index]} aria-pressed={beat.locked}
        onClick={() => change(lockBeat(story, index, !beat.locked))}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d={beat.locked ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 8-1'} />
        </svg>
      </button>
    </li>)}
  </ol>
}

export function DirectBeat({ story, index, choose, change, assign }: {
  story: Story; index: number; choose: (index: number) => void
  change: (story: Story) => void; assign: (role: Role, id: string) => void
}) {
  const beat = story.beats[index]
  const castProtected = story.beats.some(item => item.locked) || hasDirectedCast(story)
  const min = index === 2 ? story.beats[1].time + 0.5 : 0.5
  const max = index === 1 ? story.beats[2].time - 0.5 : story.scene.duration - 1
  return <section className="panel">
    <h2>Direct a beat</h2>
    <Field label="Beat"><select aria-label="Beat" value={index} onChange={event => choose(Number(event.target.value))}>
      {phases.map((phase, i) => <option key={phase} value={i}>{phase}</option>)}
    </select></Field>
    {index === 2 && <Field label="Ending">
      <select aria-label="Ending" disabled={beat.locked || hasDirectedCast(story)} value={story.beats[2].variant}
        onChange={event => change(lockBeat(chooseEnding(story, Number(event.target.value)), 2, true))}>
        {grammar[story.family].endings.map((ending, i) => <option key={ending} value={i}>{ending}</option>)}
      </select>
    </Field>}
    {index === 2 && <p className="help">Choosing an ending locks it. Unlock Outcome to keep exploring.</p>}
    {canRetime(story, index) && <Range label="Beat time (s)" min={min} max={max} step={0.1} value={beat.time}
      onChange={time => change(retimeBeat(story, index, time))} />}
    {beatRoles(story, index).map(role => {
      const available = story.scene.objects.filter(item => item.id === story.cast[role] ||
        (item.kind === roleKind(story.family, role) && !Object.values(story.cast).includes(item.id) && !item.locked))
      const labels = { lead: 'Lead', partner: 'Partner', guest: 'Guest or obstacle', landmark: 'Landmark', visitor: 'Visitor' }
      return <Field key={role} label={labels[role]}>
        <select aria-label={labels[role]} disabled={castProtected || available.length === 1} value={story.cast[role]}
          onChange={event => assign(role, event.target.value)}>
          {available.map(item => <option key={item.id} value={item.id}>{item.kind} {story.scene.objects.indexOf(item) + 1}</option>)}
        </select>
      </Field>
    })}
    <p className="help">{castProtected
      ? 'Unlock beats and cast objects, and restore story motion to reassign cast. Locked beats also protect adjacent timing.'
      : 'Add a matching object to reassign a role. Setup always begins at 0 seconds.'}</p>
  </section>
}
