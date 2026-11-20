# Decisions

- The v0.1 editor carries over the documented features of the API prototype. The original HTML and live UI were inaccessible from the development environment. The geometry, palette, scene composition, preset names, motion curves and storage format were implemented from the specification. The documented Walk behavior is represented by Move with a stride on Person.
- Canvas 2D draws the original geometric artwork of this implementation. A pose is calculated directly from the scene and time, so scrubbing backward and restarting use the same frame logic.
- Lock protects the entire object from Mutate and Shuffle. Direct edits, drag, layer changes and deletion are intentional and remain available. Shuffle can change the environment independently of object locks.
- Each generation or variation accepts an unsigned 32-bit seed. The editor uses a fresh seed by default. An explicit seed repeats a given operation on the same starting document. Story JSON preserves the full source state and the latest seed.
- Preview and production share the same static Vite output. The editor uses local browser storage and exposes JSON portability. There is no server runtime.

## Story Discovery

- Another Story changes family and generates a fresh cast composition, timing and ending. Undo returns to the previous working document.
- The Meeting brings two people together, then can split them, send them off together, hide one, let them pass, or bring in a third. The Journey brings a traveler toward a landmark that can be reached, vanish, be obstructed, be abandoned, or move. Alone disperses a group and can leave the lead alone, fade the landmark, empty the clearing, introduce a visitor, or send the lead away. The Change grows a tree before shifting the light, introducing another tree, fading the tree, or enlarging it further.
- Mutate preserves Setup, Event, cast assignment, base objects, environment and timing. It selects a different compatible Outcome variant. Outcome Lock prevents that choice. Locking Setup and Event leaves their alternative endings available.
- Vary scenery is a separate operation that recolors background objects with unchanged colors from the generator or a previous scenery variation. It respects manually edited colors and object locks and is disabled by any beat lock.
- Cast motion edited by hand replaces that object's scripted track. A manual cast action or cast object lock blocks plot mutation, with an explanation and a way to restore scripted motion. Positions, color, layout, manually adjusted time and environment stay through Mutate. Moving a cast object edits its starting anchor, and the script still guides it toward its event destination.
- Explicitly selecting a new ending locks it. To retime a beat, unlock that beat and the preceding one because a cue can span both. Recasting requires unlocked beats and an available object of the required kind. A replaced cast object remains as a free object. Cast deletion requires reassigning the role first. Object and environment edits are explicit overrides and may change the composition of a locked beat.
- The same pure sampler supports a future frame export. The current 16:9 art and composition are tailored to this release.

## Form Lab

- Each effect has its own field equation. Seeded mark identities persist between frames without particles accumulating state. All effects close their loop at the configured duration.
- Energy modulates the phase velocity and reach. Order changes regularity, Density sets mark count, Tension changes the field's pull or spread, Rhythm shapes the wave, and Complexity changes structure and detail. Slider changes are eased on the displayed canvas. A pointer drag creates one history entry.
- Next Composition chooses a different preset family and reseeds its layout and parameters. Mutate nudges unlocked parameters by a seeded amount while keeping composition identity. Lock protects a parameter during Mutate. Direct slider edits remain available. The optional variation seed repeats either operation from the same document.
- Autoplay is paused initially when the browser requests reduced motion. The main controls work without opening advanced settings. Collection, JSON and the PNG exporter are available without a server.
