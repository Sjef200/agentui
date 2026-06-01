import type { AgentEvent, AgentEventOfType } from '../src/types.js';

// One valid, fully-typed sample per event type. Typing each as AgentEventOfType<K>
// means the compiler also checks the hand-written types against these shapes.
export const sessionStart: AgentEventOfType<'session_start'> = {
  v: 1,
  id: 'a1',
  session: 's1',
  seq: 0,
  ts: 1_700_000_000_000,
  agent: 'claude-code',
  type: 'session_start',
  data: { cwd: '/home/user/app', title: 'fix the bug' },
};

export const message: AgentEventOfType<'message'> = {
  v: 1,
  id: 'a2',
  session: 's1',
  seq: 1,
  ts: 1_700_000_000_100,
  agent: 'claude-code',
  type: 'message',
  data: { role: 'assistant', text: 'On it.' },
};

export const toolCall: AgentEventOfType<'tool_call'> = {
  v: 1,
  id: 'a3',
  session: 's1',
  seq: 2,
  ts: 1_700_000_000_200,
  agent: 'claude-code',
  type: 'tool_call',
  data: { name: 'Read', args: { path: 'src/index.ts' } },
};

export const toolResult: AgentEventOfType<'tool_result'> = {
  v: 1,
  id: 'a4',
  session: 's1',
  seq: 3,
  ts: 1_700_000_000_300,
  agent: 'claude-code',
  type: 'tool_result',
  data: { name: 'Read', ok: true, result: '42 lines' },
};

export const fileEdit: AgentEventOfType<'file_edit'> = {
  v: 1,
  id: 'a5',
  session: 's1',
  seq: 4,
  ts: 1_700_000_000_400,
  agent: 'claude-code',
  type: 'file_edit',
  data: {
    path: 'src/index.ts',
    diff: '--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new\n',
  },
};

export const command: AgentEventOfType<'command'> = {
  v: 1,
  id: 'a6',
  session: 's1',
  seq: 5,
  ts: 1_700_000_000_500,
  agent: 'claude-code',
  type: 'command',
  data: { cmd: 'pnpm test', cwd: '/home/user/app', exitCode: 0, stdout: 'ok', stderr: '' },
};

export const tokenUsage: AgentEventOfType<'token_usage'> = {
  v: 1,
  id: 'a7',
  session: 's1',
  seq: 6,
  ts: 1_700_000_000_600,
  agent: 'claude-code',
  type: 'token_usage',
  data: { input: 1200, output: 340, costUsd: 0.012 },
};

export const sessionEnd: AgentEventOfType<'session_end'> = {
  v: 1,
  id: 'a8',
  session: 's1',
  seq: 7,
  ts: 1_700_000_000_700,
  agent: 'claude-code',
  type: 'session_end',
  data: { reason: 'completed' },
};

export const errorEvent: AgentEventOfType<'error'> = {
  v: 1,
  id: 'a9',
  session: 's1',
  seq: 8,
  ts: 1_700_000_000_800,
  agent: 'claude-code',
  type: 'error',
  data: { message: 'boom', detail: 'stack...' },
};

export const allSamples: AgentEvent[] = [
  sessionStart,
  message,
  toolCall,
  toolResult,
  fileEdit,
  command,
  tokenUsage,
  sessionEnd,
  errorEvent,
];
