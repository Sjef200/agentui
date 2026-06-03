# @agent-ui/core

The event-schema **contract** for [Agent UI](https://github.com/Sjef200/agentui) —
tool-agnostic, real-time observability for AI coding agents.

Everything an agent does is normalized into one event. Adapters write only this
schema; every surface reads only this schema.

```ts
import { validate, makeEvent, redact, type AgentEvent } from '@agent-ui/core';

const event = makeEvent({
  session: 's1',
  seq: 0,
  agent: 'claude-code',
  type: 'command',
  data: { cmd: 'pnpm test', exitCode: 0 },
});

validate(event); // throws on an unknown type or a missing/ill-typed field
const safe = redact(event); // scrub secrets from event.data before storage/emission
```

Event types: `session_start`, `session_end`, `message`, `tool_call`, `tool_result`,
`file_edit`, `command`, `token_usage`, `error`. Zero runtime dependencies beyond
`zod`. See the repository for the full schema and contract.

## License

MIT
