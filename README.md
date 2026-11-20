# Tiny Kit

**A workspace for playable sketches.**

Site: https://tinykit.hequ.ru (custom DNS pending propagation)  
Current independent Vercel deployment: https://tinykit-kwosey-2043s-projects.vercel.app

## What is Tiny Kit?

Tiny Kit is a small home for interactive experiments. The goal is to shorten the time between *imagining a mechanic* and *playing with it*.

The first sketch is **Tiny Scenes**, a tiny 2D scene composer exploring objects, motion, and events.

## Project boundaries

- Separate from [Hequ](https://hequ.ru). Do not import or modify Hequ's source, storage, deployments, or DNS records.
- Small playable sketches first. No universal engine up front.
- Reuse only mechanics proven across real experiments.
- Vercel project `tinykit` exists. **Do not create another Vercel project** to link GitHub.
- The initial working prototype was deployed directly to Vercel via API (single HTML file) **before this repository existed**. Its source must be imported and verified before enabling Git-driven production deployment.
- The custom domain `tinykit.hequ.ru` was added in Vercel; DNS is managed at REG.RU.
- Existing code is not yet versioned here. This repository currently holds project planning, not a verified copy of the live app.

## Tiny Scenes v0.1 (deployed prototype)

An animated 16:9 Canvas scene with an environment switcher, selectable/draggable people and trees, motion presets, speed/position controls, object locking, mutation, local draft saving, playback, and PNG still export.

## Next steps

1. Recover/import the **exact live deployed source**, then run local smoke tests. Preserve current app behavior.
2. Split the single-file prototype into maintainable modules. Keep the experiment runnable after every step.
3. Connect this repo to the existing Vercel project `tinykit` through **Vercel dashboard → Project Settings → Git**; do not overwrite the live deployment with this docs-only repository.
4. Test preview, then switch production to Git-based deployment after review.
5. Add focused tests and extract only generic, useful building blocks.

## Creative rule

**Sketch first. Polish later.** A tiny working plaything beats an overbuilt platform.
