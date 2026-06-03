# @agent-ui/cli

The `agent-ui` command-line tool for [Agent UI](https://github.com/Sjef200/agentui).

```bash
npx @agent-ui/cli demo          # replay a recorded session into a running server
# or install the `agent-ui` command globally:
npm i -g @agent-ui/cli
agent-ui demo --fast
```

## Commands

- **`demo [fixture]`** — replay a JSONL fixture into the server, paced by the
  recorded timestamps. Flags: `--fast`, `--speed <n>`, `--server <url>`,
  `--session <id>`.
- `watch` / `ingest` / `replay` / `init` — live-capture commands; verified locally
  against an installed agent CLI (see the repository roadmap).

Point it at a running [`@agent-ui/server`](https://www.npmjs.com/package/@agent-ui/server)
(default `http://127.0.0.1:4317`) and watch events render in the dashboard.

## License

MIT
