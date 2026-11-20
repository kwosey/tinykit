# Tiny Kit

Tiny Kit is an independent workspace for playable sketches. **Imagine → Build → Play → Evolve.**

**Tiny Scenes** is a 16:9 Canvas scene editor. It opens with a populated scene. Pick an environment, drag a figure or select it from the object list, assign an action, and press Play. Use the scrubber to compose a still.

## Run locally

Use Node.js 22.12+ or 24 LTS and npm.

```sh
npm ci
npm run dev
```

Vite prints the local address. For a production build, run `npm run build`, then `npm run preview`. No credentials or backend are needed to run the editor.

- Add people, buildings, trees, cars or text. Adjust their position, size, color, layer, and motion.
- Mutate changes unlocked objects. Shuffle also picks an environment and moves unlocked objects more widely. The seed makes each operation reproducible from the same starting scene.
- The draft saves locally. Save creates a separate snapshot and Restore loads it. Use JSON to move scenes between browsers and PNG for a 960 × 540 still.

See [architecture](ARCHITECTURE.md), [scene JSON](DATA_CONTRACTS.md), [testing](TESTING.md), [decisions](DECISIONS.md) and [backlog](BACKLOG.md).

## Prototype and release

The existing Vercel project `tinykit` hosts the original API-deployed prototype as deployment `dpl_GD8Uw5tkbAosEnjxJuAUu84WsiNJ`. The onboarding environment's proxy denied access to the deployment and Vercel API, so v0.1 implements the documented behavior. The original appearance, presets, timings, and legacy storage format remain unverified. Compare both versions before approving a production switch.

To review safely, select the existing **tinykit** project in Vercel. An authorized teammate can link a local checkout with `vercel link` (select that project) and run `vercel deploy` from the feature branch to create a Preview. Use the Vite framework preset, `npm ci`, build command `npm run build` and output directory `dist`. Run the checks in [TESTING.md](TESTING.md) against Preview and compare the original.

After explicit approval of the production change, open **tinykit → Settings → Git → Connect Git Repository**, choose `kwosey/tinykit`, and verify the production branch is `main`. Coordinate the PR merge and Git connection with the release owner because pushes or an initial Git deployment can deploy production. Keep the existing project and domain assignment. Verify the production deployment and `tinykit.hequ.ru` after release.
