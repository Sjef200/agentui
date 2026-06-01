// Placeholder skeleton.
//
// The Claude Code adapter (Phase 5, T5.1) MUST be implemented and verified
// LOCALLY against an installed `claude` binary — the sandbox has no live agent.
// Before coding, run `claude --help` and confirm the current machine-readable
// /stream output mode and its JSON shape, then implement a *pure* parser
// (raw stream in -> normalized core events out) covered by a golden-file test.
export const AGENT_NAME = 'claude-code' as const;
