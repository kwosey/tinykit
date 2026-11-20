# Decisions

- The v0.1 editor carries over the documented features of the API prototype. The original HTML and live UI were inaccessible from the development environment. The geometry, palette, scene composition, preset names, motion curves and storage format were implemented from the specification. The documented Walk behavior is represented by Move with a stride on Person.
- Canvas 2D draws the original geometric artwork of this implementation. A pose is calculated directly from the scene and time, so scrubbing backward and restarting use the same frame logic.
- Lock protects the entire object from Mutate and Shuffle. Direct edits, drag, layer changes and deletion are intentional and remain available. Shuffle can change the environment independently of object locks.
- Variations use the same scene, operation and seed to reproduce an outcome. The editor advances the seed field after use for quick exploration. Scene JSON stores the seed that generated the current snapshot.
- Preview and production share the same static Vite output. The editor uses local browser storage and exposes JSON portability. There is no server runtime.
