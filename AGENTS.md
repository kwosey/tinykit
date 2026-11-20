# Tiny Kit

Build compact, playful experiments. Tiny Scenes is the first one. Keep the time to first play short.

- Work in this project only. Hequ and Job Search HQ have separate source, storage, deployment and DNS.
- Use the existing Vercel project named `tinykit`. Preserve the original API deployment until the current implementation is compared and smoke-tested. Production and PR merges require explicit user approval.
- Preserve saved drafts when changing data formats or localStorage keys. A scene from v0.1 opens as a free scene. Build generated stories from the grammar in `src/stories`. See [DATA_CONTRACTS.md](DATA_CONTRACTS.md).
- Keep the scene engine independent of React. Compile story rules to the shared motion sampler. Validate role links, timing and locked beat behavior when changing the grammar. Keep shared primitives limited to patterns used by the editor. See [ARCHITECTURE.md](ARCHITECTURE.md).
- Keep scene art in the existing geometric style. Creative content generation is outside this release.
- Run `npm ci`, `npm test`, and `npm run build`. For editor changes, exercise desktop and mobile using [TESTING.md](TESTING.md).
