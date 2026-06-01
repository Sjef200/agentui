<!-- One feature per PR. Conventional Commits in the title, e.g. feat(core): ... -->

## What & why

<!-- What does this change do, and why? -->

## How it fits the pipeline

<!-- Which stripe does this touch? capture / adapters / core / surfaces -->

## Definition of Done

- [ ] typecheck green (`pnpm typecheck`)
- [ ] lint clean (`pnpm lint`)
- [ ] tests added and green (`pnpm test`)
- [ ] no `any`
- [ ] README / CLAUDE.md updated if conventions changed
- [ ] changeset added (`pnpm changeset`) if user-facing
- [ ] adapters: golden-file test (recorded input → expected normalized events)
