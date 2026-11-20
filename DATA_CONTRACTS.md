# Scene data

Portable JSON is the same versioned document used for browser saves. No assets or playback state are embedded.

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
- Local keys are `tinykit.scenes.v1.draft` and `tinykit.scenes.v1.saved`. Unreadable data is preserved in place. Export JSON to keep new edits if browser storage cannot be used. Invalid imports leave the open scene intact. The original deployment's draft format is unknown and has no migration in this release.
