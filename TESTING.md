# Testing

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright starts Vite Preview on 127.0.0.1:4173. With a compatible system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path when running the suite. Browser projects cover desktop Chromium and Pixel 7 emulation with real touch event dispatch. The PNG assertion compares the downloaded bytes with the same unselected frame on the stage and checks 960 × 540 dimensions.

Vitest exercises scene edits, history, deterministic mutation and locks, all actions, playback and schema validation. The browser checks exercise canvas drag, history, mutation, playback, local persistence, PNG, JSON and overflow. They capture uncaught page errors and console errors along the main editing flow.

Story tests span each family and all ending variants, recurrence at the same seed, valid cast and timing, lock protection, deterministic sampling, manual overrides, and independent collection records. The v0.1 fixture uses the documented, implemented schema. The unsupported prototype fixture verifies preservation at the historical key and is synthetic.

The Chromium story flow covers discovery, playback, switching, variation, beat locks, Direct, JSON round-trip, Keep, Undo/Redo, collection reopen and removal, and persistence after reload. Both desktop Chromium and Pixel 7 emulation execute it.

For Preview review, open the scene on a desktop and a physical phone. Try each object and environment, drag a moving object from a scrubbed frame, adjust several motions, turn Loop off and let Play finish. Reload after editing, restore an explicit save, then import the exported JSON into another browser. Open the PNG and compare it with the stage at the exported playhead. Inspect the console during the flow.

## Form Lab

The unit suite verifies seeded variations, locks, ranges, history, bounded marks, parameter response and frame continuity for all eight effects, and storage isolation. The browser flows exercise the transport and loop modes, live slider changes, locked mutation, history, collection reopen, reload, invalid JSON, and navigation back to Tiny Scenes. They also render every preset and compare the 960 × 600 PNG with the visible canvas.

For visual review, play each preset through two loops on desktop and a physical phone. Compare each effect at the minimum, midpoint and maximum of its main controls. Check responsiveness while dragging a slider during playback, then try Next and Mutate several times to judge how often the variations are worth keeping.

The Form Lab polish checks the choice-strip selection, keyboard activation, preset matching, persisted settings, and touch swipes at 320, 375, 390, and 428 CSS px without scrolling the document horizontally. It also checks transport rows, touch target height, and page width at 140% root text size. Chromium mobile emulation complements a physical iPhone Safari review.
