# Scene data

Portable JSON is the same versioned document used for browser saves. No assets or playback state are embedded. Version 1 remains the free-scene schema.

```json
{
  "version": 1,
  "environment": "Dusk",
  "duration": 6,
  "seed": 42,
  "objects": [
    {
      "id": "person",
      "kind": "Person",
      "x": 364,
      "y": 446,
      "size": 1,
      "color": "#e9ae78",
      "text": "Hello, world",
      "locked": false,
      "motion": {
        "action": "Move",
        "start": 0,
        "duration": 6,
        "intensity": 2.5,
        "dx": 125,
        "dy": -7
      }
    }
  ]
}
```

- `environment` is Dusk, Desert or Night. Scene duration is 2–10 seconds. The seed is an unsigned 32-bit integer and records the most recent variation seed.
- Up to 200 objects render in array order from back to front. IDs are unique strings of 1–80 characters. Kinds are Person, Building, Tree, Car and Text. Position is an anchor in scene units (0–960 × 0–540), size is 0.25–3, color is six-digit hex, and text is at most 48 UTF-16 code units.
- Motion uses Still, Move, Float, Pulse, Appear, Disappear, Rotate or Scale. Start is 0–10 seconds, duration is 0.1–10 seconds and intensity is 0.1–3. Move offsets are signed scene units up to the corresponding canvas dimension. A motion may extend beyond the current scene duration.
- Local keys are `tinykit.scenes.v1.draft` and `tinykit.scenes.v1.saved`. Unreadable data is preserved in place. Export JSON to keep new edits if browser storage cannot be used. Invalid imports leave the open scene intact. The free-scene decoder rejects compiled tracks and malformed fields.

## Story document, version 2

| Field | Stored value |
| --- | --- |
| `version` | `2` |
| `family` | `meeting`, `journey`, `alone` or `change` |
| `beats` | Three records in order. Each has `phase` (`setup`, `event`, `outcome`), `time` in seconds and `locked`. The outcome also has a zero-based `variant` from its family's ending list. |
| `cast` | Five distinct object IDs keyed by `lead`, `partner`, `guest`, `landmark`, `visitor`. Landmark is a Tree. Guest is a Building in Journey, a Tree in Change, and a Person elsewhere. The other roles use Person. |
| `scene` | Valid version 1 scene containing the editable base objects (including inactive cast), initial environment, duration, and the latest operation seed |
| `manualMotion`, `manualStyle` | Unique object IDs with explicit action and color edits, respectively |
| `distance`, `nextEnvironment` | Seeded approach distance (100–220 scene units) and a preset for a possible light change |

The compiler derives tracks and backdrop transitions at runtime. They are omitted from JSON. Opening version 1 data gives a free scene with its object actions intact.

## Local storage and recovery

The working document is stored at `tinykit.scenes.v2.draft`. The app first looks for a valid v2 draft, then at the v0.1 draft and historical prototype key `tinykit.scene.v1`. A saved v0.1 scene and both older drafts can also be opened explicitly from Collection. Only documents that validate against the known version 1 scene contract are accepted from older keys. The actual API prototype schema could not be confirmed, so other shapes are preserved as bytes and reported as unsupported.

Collection entries have one key per stable ID at `tinykit.scenes.v2.kept.<id>`. Each entry stores `{id, document, date}` where date is Unix epoch milliseconds. Keep snapshots the entire document and treats exact JSON equality as a duplicate. Opening a snapshot leaves the original available. An invalid entry is counted and preserved independently of valid entries. An unreadable v2 draft is protected from autosave. Storage is scoped to the browser origin, so use JSON for transfer between deployment URLs.

## Form Lab document, version 1

Form Lab JSON has `type: "form-lab"` and `version: 1`. It stores the effect, shape, and palette names from `src/forms/model.ts`, an unsigned 32-bit layout seed, duration in seconds (4–30), and six integer `values` (0–100) with corresponding Boolean `locks`. The parameter keys are Energy, Order, Density, Tension, Rhythm, and Complexity. Playback position, loop controls and the optional operation seed input are session state.

The autosave key is `tinykit.form-lab.v1.draft`. Kept compositions use `tinykit.form-lab.v1.kept.<id>`, with `{id, savedAt, value}` per entry and a Unix epoch timestamp in milliseconds. Keep skips an identical normalized document. Unreadable drafts block autosave and unreadable collection entries are preserved independently of valid snapshots. Form Lab reads and writes only its own storage namespace.
