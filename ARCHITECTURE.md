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

## Form Lab

Form Lab is the default route. The hash navigation also opens Tiny Scenes directly at `/#tiny-scenes`. Each experiment owns its root component, history and storage namespace.

| Module | Responsibility |
| --- | --- |
| `src/forms/model.ts` | Versioned document, shape and palette vocabulary, curated presets, seeded Next and Mutate, validation |
| `src/forms/effects.ts` | Eight analytic fields mapping seeded marks and loop phase to frame geometry |
| `src/forms/render.ts` | Canvas 2D palette and geometry drawing on a 960 × 600 backing canvas |
| `src/forms/Canvas.tsx`, `App.tsx` | Stage, control interpolation, scrubber, history, collection and files |
| `src/forms/storage.ts` | Isolated draft and per-entry snapshots |

The experiments share the transport state transitions, deterministic number generator, immutable history and browser I/O helpers. Motion uses elapsed seconds and periodic functions, so rendering the same composition at a fixed time has no dependency on previous frames. Density fades in the last mark as count crosses an integer. A frame contains at most 111 marks, under the 112-mark cap. The stage eases changes to numeric parameters only while they are settling and stops requesting redraws when the paused image is stable. PNG captures the actual pixels currently on the stage, including a slider transition if one is in progress.
