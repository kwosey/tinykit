# AGENTS.md — Tiny Kit

## Product intent
Build playful, compact interactive experiments. Optimize for time-to-first-play and exploration, not maximal feature counts.

## Non-negotiable boundaries
- Tiny Kit is independent of Hequ and Job Search HQ.
- Never alter any other project's repository, domain, database, or Vercel configuration.
- The existing Vercel project is named `tinykit`. Do not create a duplicate.
- **The repo starts as documentation-only.** Do not enable production Git deployment until the original deployed prototype is recovered into the repository, compared and smoke-tested.
- Do not silently replace the initial deployed prototype with a blank starter screen.
- Prefer focused branches and reviewable PRs. Do not merge or release to production without user approval.
- Preserve users' saved drafts when modifying data formats or localStorage keys.
- No AI-generated creative content unless explicitly required by a future experiment.

## Technical direction, not yet implemented
- Small independent modules: rendering, scene model, playback, controls, persistence.
- Shared primitives: controls, presets, deterministic randomization, lock/mutate, save/restore — but extract only from repeated real use.
- Add basic unit and browser smoke tests before feature expansion.
- Document actual implementation rather than inventing architecture.
