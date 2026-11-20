# Architecture

| Layer | Files | Responsibilities |
| --- | --- | --- |
| Foundation | `src/foundation/controls.tsx`, `state.ts`, `storage.ts` | Parameter controls, preset selector, seeded number generator, bounded immutable history, storage and browser downloads |
| Scene engine | `src/scenes/model.ts`, `motion.ts`, `render.ts`, `persistence.ts` | Scene edits, mutation and lock rules, animation poses and playback, Canvas drawing and hit testing, versioned scene decoding |
| Scene UI | `src/scenes/App.tsx`, `Stage.tsx`, `src/style.css` | Editor, clock, selection, pointer gestures, autosave, file actions and responsive layout |

An edit creates a scene snapshot through an engine function and commits it into history. History retains up to 50 previous snapshots. The stage renders from the selected snapshot and a clock in seconds. Selection, loop and playback time are session state. During a drag, pointer capture keeps the interaction on the canvas and the stage shows a temporary position. Releasing the pointer makes one history entry.

Object geometry uses 960 × 540 scene units. Hit testing traverses objects front to back, reversing translation, rotation and scale before testing local bounds. The same renderer draws the stage and the PNG. PNG omits selection guides and captures the committed scene at the current playhead.
