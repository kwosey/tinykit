# Architecture

| Layer | Files | Responsibilities |
| --- | --- | --- |
| Foundation | `src/foundation/controls.tsx`, `state.ts`, `storage.ts` | Parameter controls, preset selector, seeded number generator, bounded immutable history, storage and browser downloads |
| Scene engine | `src/scenes/model.ts`, `motion.ts`, `render.ts`, `persistence.ts` | Scene edits, mutation and lock rules, animation poses and playback, Canvas drawing and hit testing, versioned scene decoding |
| Story grammar | `src/stories/grammar.ts`, `storage.ts` | Seeded family rules, beat and role contracts, compilation to scene motion, versioned draft and collection |
| Scene UI | `src/scenes/App.tsx`, `Stage.tsx`, `ObjectControls.tsx`, `src/stories/StoryBeats.tsx`, `src/style.css` | Editor, clock, selection, pointer gestures, autosave, file actions and responsive layout |

An edit creates a working document snapshot through an engine function and commits it into history. History retains up to 50 previous snapshots. The stage renders from the selected snapshot and a clock in seconds. Selection, loop and playback time are session state. During a drag, pointer capture keeps the interaction on the canvas and the stage shows a temporary position. Releasing the pointer makes one history entry.

Object geometry uses 960 × 540 scene units. Hit testing traverses objects front to back, reversing translation, rotation and scale before testing local bounds. The same renderer draws the stage and the PNG. PNG omits selection guides and captures the committed scene at the current playhead.

## Beats and motion

Setup, Event and Outcome are ordered. The first two events are defined by the family, and Outcome selects from compatible variants for that family. Cast maps named roles to objects of the required kind. A generated story uses the same cast across its endings. A reserved participant can be invisible until its arrival.

The compiler emits motion tracks for cast members. Each cue uses the original motion sampler, with relative Move deltas, multiplicative opacity/scale, and additive rotation. When it queues a later Move, the compiler samples the preceding cues at its starting time to determine the delta from that pose. The renderer, hit testing and PNG exporter use the resulting scene and time. Backdrop changes sample the same clock. Object editing changes the source scene, then the track is recompiled. A cast object's manually assigned action replaces its track.

The Setup always begins at zero. Event starts at least half a second later, Outcome at least another half second later, and the scene leaves at least one second for its outcome. All generated endings use those intervals. Silent actors are hidden from the first frame. Visible fade-ins and departure motions start only when their outcome occurs.
