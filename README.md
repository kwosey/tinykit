# Tiny Kit

Tiny Kit is an independent workspace for playable sketches. **Imagine → Build → Play → Evolve.**

**Form Lab** is a playground for visual behaviors and the default experiment at `/`. It opens with Orbital Loom. Use Next Composition to explore a different behavior, the six controls to shape the result, and Keep to save a snapshot. More settings includes the curated presets, duration, seed, and JSON and PNG export.

**Tiny Scenes** is a 16:9 playground for discovering little stories at `/#tiny-scenes`. On a fresh visit, press Play to watch a short, generated story. Try Another Story to switch to a different family or Mutate to find a new ending. Tap a beat to jump to that moment, lock it to protect it, and use Keep to save the version in Collection.

## Run locally

Use Node.js 22.12+ or 24 LTS and npm.

```sh
npm ci
npm run dev
```

Vite prints the local address. For a production build, run `npm run build`, then `npm run preview`. No credentials or backend are needed to run the editor.

- **Edit** opens beat timing and cast controls alongside the object editor. Add a matching object to recast a role. Choosing an ending locks Outcome until you unlock it.
- Work in the free editor by importing a v0.1 scene or opening an older browser draft or save from Collection. The old data stays at its original key.
- Import and export story or free scene JSON under Edit → Files. PNG captures the current 960 × 540 frame. Undo and Redo cover changes to the working draft, including switching stories.

See [architecture](ARCHITECTURE.md), [scene JSON](DATA_CONTRACTS.md), [testing](TESTING.md), [decisions](DECISIONS.md) and [backlog](BACKLOG.md).

## Form Lab presets

| Starting composition | Behavior |
| --- | --- |
| Orbital Loom | Orbit |
| Petal Hour | Bloom |
| Tidal Thread | Flow |
| Gravity Well | Collapse |
| Magnetic Field | Attract / Repel |
| Echo Chamber | Echo |
| Prism Scatter | Split / Merge |
| Breathing Grid | Distortion |

Energy controls movement and reach, Order controls regularity, Density controls the number of marks, Tension controls pull and spread, Rhythm controls the pulse, and Complexity controls detail. Mutate varies unlocked controls while preserving the behavior, shape, palette and layout seed. The lock beside each slider applies to Mutate. Keep snapshots a composition in an independent collection.

## Preview and release

Form Lab depends on [Story Discovery PR #3](https://github.com/kwosey/tinykit/pull/3). While v0.2 is unmerged, review Form Lab against `tinykit-v0.2-story-discovery`. Story Discovery depends on [v0.1 PR #2](https://github.com/kwosey/tinykit/pull/2). While that PR is open, the review base for v0.2 is `tinykit-v0.1-foundation`. Preview builds should use the existing Vercel project `tinykit`.


The existing Vercel project `tinykit` hosts the original API-deployed prototype as deployment `dpl_GD8Uw5tkbAosEnjxJuAUu84WsiNJ`. The onboarding environment's proxy denied access to the deployment and Vercel API, so v0.1 implements the documented behavior. The original appearance, presets, timings, and legacy storage format remain unverified. Compare both versions before approving a production switch.

To review safely, select the existing **tinykit** project in Vercel. An authorized teammate can link a local checkout with `vercel link` (select that project) and run `vercel deploy` from the feature branch to create a Preview. Use the Vite framework preset, `npm ci`, build command `npm run build` and output directory `dist`. Run the checks in [TESTING.md](TESTING.md) against Preview and compare the original.

After explicit approval of the production change, open **tinykit → Settings → Git → Connect Git Repository**, choose `kwosey/tinykit`, and verify the production branch is `main`. Coordinate the PR merge and Git connection with the release owner because pushes or an initial Git deployment can deploy production. Keep the existing project and domain assignment. Verify the production deployment and `tinykit.hequ.ru` after release.
