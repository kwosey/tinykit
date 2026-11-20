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

For Preview review, open the scene on a desktop and a physical phone. Try each object and environment, drag a moving object from a scrubbed frame, adjust several motions, turn Loop off and let Play finish. Reload after editing, restore an explicit save, then import the exported JSON into another browser. Open the PNG and compare it with the stage at the exported playhead. Inspect the console during the flow.
