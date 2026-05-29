import type { DiffLine, Message, ToolCall } from './types';

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export interface AcpCallbacks {
  onToken: (messageId: string, token: string) => void;
  onToolCall: (messageId: string, toolCall: ToolCall) => void;
  onToolCallUpdate: (messageId: string, toolCallId: string, update: Partial<ToolCall>) => void;
  onPermissionNeeded: (messageId: string, toolCallId: string) => void;
  onDone: (messageId: string) => void;
}

const FAKE_DIFF: DiffLine[] = [
  { type: 'context', content: 'import express from "express";' },
  { type: 'context', content: 'import { db } from "./db";' },
  { type: 'context', content: '' },
  { type: 'remove', content: 'app.get("/users", async (req, res) => {' },
  { type: 'remove', content: '  const users = await db.query("SELECT * FROM users");' },
  { type: 'add', content: 'app.get("/users", async (req, res) => {' },
  { type: 'add', content: '  const { page = 1, limit = 20 } = req.query;' },
  { type: 'add', content: '  const offset = (Number(page) - 1) * Number(limit);' },
  { type: 'add', content: '  const users = await db.query(' },
  { type: 'add', content: '    "SELECT * FROM users LIMIT $1 OFFSET $2",' },
  { type: 'add', content: '    [limit, offset]' },
  { type: 'add', content: '  );' },
  { type: 'context', content: '  res.json({ users: users.rows });' },
  { type: 'context', content: '});' },
];

const RESPONSES: Array<{
  prompt: RegExp;
  steps: Array<() => AsyncGenerator<string | null>>;
}> = [];

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function* streamText(text: string, chunkSize = 3, delayMs = 25) {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await delay(delayMs);
  }
}

export async function simulateAgentResponse(
  userMessage: string,
  msgId: string,
  cbs: AcpCallbacks
) {
  await delay(600);

  const lower = userMessage.toLowerCase();
  const isBash = lower.includes('run') || lower.includes('test') || lower.includes('install') || lower.includes('build') || lower.includes('check');
  const isRead = lower.includes('read') || lower.includes('show') || lower.includes('open') || lower.includes('look') || lower.includes('file');
  const isWrite = lower.includes('fix') || lower.includes('edit') || lower.includes('update') || lower.includes('change') || lower.includes('add') || lower.includes('refactor') || lower.includes('paginate') || lower.includes('optimize');
  const isExplain = lower.includes('explain') || lower.includes('what') || lower.includes('how') || lower.includes('why') || lower.includes('help');

  if (isExplain) {
    const intro =
      "I can help with that. Based on the project structure I can see, here's what's happening:\n\n";
    for await (const token of streamText(intro)) {
      cbs.onToken(msgId, token);
    }
    const body =
      "The current implementation uses a straightforward approach that works well for small datasets, but as your application scales you'll want to consider pagination, caching, and connection pooling.\n\nThe key files involved are:\n• `src/routes/users.ts` — main route handler\n• `src/db/index.ts` — database connection\n• `src/middleware/auth.ts` — authentication layer\n\nWould you like me to walk through any of these in detail?";
    for await (const token of streamText(body)) {
      cbs.onToken(msgId, token);
    }
    cbs.onDone(msgId);
    return;
  }

  const preamble = isWrite
    ? "I'll analyze the current implementation and make the necessary changes.\n\n"
    : isBash
    ? "Let me run that and check the output.\n\n"
    : "Let me take a look at the relevant files.\n\n";

  for await (const token of streamText(preamble)) {
    cbs.onToken(msgId, token);
  }

  if (isBash || (!isRead && !isWrite)) {
    const tcId = makeId();
    const cmd = isBash
      ? userMessage.includes('test')
        ? 'pnpm run test'
        : userMessage.includes('build')
        ? 'pnpm run build'
        : userMessage.includes('install')
        ? 'pnpm install'
        : 'pnpm run dev'
      : 'git status';

    cbs.onToolCall(msgId, {
      id: tcId,
      name: 'bash',
      status: 'running',
      input: { command: cmd },
    });

    await delay(1400);

    const output =
      cmd === 'pnpm run test'
        ? '✓ 42 tests passed\n✓ Coverage: 87%\n\nAll tests pass.'
        : cmd === 'pnpm run build'
        ? '> tsc --noEmit\n> esbuild src/index.ts\n\nbuild: dist/index.js (124 kB)'
        : cmd === 'pnpm install'
        ? 'Packages: +18\nProgress: resolved 234, reused 216, downloaded 18, added 18\nDone in 3.1s'
        : 'M  src/routes/users.ts\n?? src/routes/payments.ts';

    cbs.onToolCallUpdate(msgId, tcId, { status: 'done', output });
    await delay(300);

    const followup = '\n' + (
      cmd.includes('test')
        ? 'All tests are passing. The suite covers the core routes and database interactions.'
        : cmd.includes('build')
        ? 'Build succeeded with no type errors.'
        : 'Everything looks clean. Ready to proceed.'
    );
    for await (const token of streamText(followup)) {
      cbs.onToken(msgId, token);
    }
    cbs.onDone(msgId);
    return;
  }

  if (isRead) {
    const tcId = makeId();
    const file = 'src/routes/users.ts';
    cbs.onToolCall(msgId, {
      id: tcId,
      name: 'read_file',
      status: 'running',
      input: { path: `/home/dev/project/${file}` },
      filePath: file,
    });

    await delay(900);

    const fileContent =
      'import express from "express";\nimport { db } from "./db";\n\napp.get("/users", async (req, res) => {\n  const users = await db.query("SELECT * FROM users");\n  res.json({ users: users.rows });\n});';

    cbs.onToolCallUpdate(msgId, tcId, { status: 'done', output: fileContent });
    await delay(300);

    const analysis =
      '\nI can see the issue — the query fetches all users without pagination. For a growing dataset this will become a performance bottleneck.\n\nWould you like me to add cursor-based pagination or offset-based pagination?';
    for await (const token of streamText(analysis)) {
      cbs.onToken(msgId, token);
    }
    cbs.onDone(msgId);
    return;
  }

  if (isWrite) {
    const readTcId = makeId();
    cbs.onToolCall(msgId, {
      id: readTcId,
      name: 'read_file',
      status: 'running',
      input: { path: '/home/dev/project/src/routes/users.ts' },
      filePath: 'src/routes/users.ts',
    });

    await delay(800);
    cbs.onToolCallUpdate(msgId, readTcId, {
      status: 'done',
      output:
        'app.get("/users", async (req, res) => {\n  const users = await db.query("SELECT * FROM users");\n  res.json({ users: users.rows });\n});',
    });

    await delay(200);

    const analysis =
      '\nI can see the current implementation. It fetches all rows without any limit, which will cause issues at scale.\n\nI\'ll add offset-based pagination with `page` and `limit` query parameters:\n\n';
    for await (const token of streamText(analysis)) {
      cbs.onToken(msgId, token);
    }

    const writeTcId = makeId();
    cbs.onToolCall(msgId, {
      id: writeTcId,
      name: 'write_file',
      status: 'permission_needed',
      input: { path: '/home/dev/project/src/routes/users.ts' },
      filePath: 'src/routes/users.ts',
      diff: FAKE_DIFF,
    });

    cbs.onPermissionNeeded(msgId, writeTcId);
    return;
  }

  const generic =
    "I've analyzed the codebase. Everything looks good — the architecture is clean and the implementation follows best practices. Let me know if you'd like me to dig into any specific area.";
  for await (const token of streamText(generic)) {
    cbs.onToken(msgId, token);
  }
  cbs.onDone(msgId);
}

export async function continueAfterPermission(
  msgId: string,
  toolCallId: string,
  granted: boolean,
  cbs: AcpCallbacks
) {
  await delay(300);

  if (!granted) {
    const denied = '\nUnderstood — skipped the file write. Let me know if you\'d like me to try a different approach.';
    for await (const token of streamText(denied)) {
      cbs.onToken(msgId, token);
    }
    cbs.onDone(msgId);
    return;
  }

  cbs.onToolCallUpdate(msgId, toolCallId, { status: 'done' });
  await delay(400);

  const success =
    '\nDone. I\'ve updated `src/routes/users.ts` with offset-based pagination.\n\nThe `/users` endpoint now accepts `page` and `limit` query parameters (defaults: `page=1`, `limit=20`). Existing clients that don\'t pass these parameters will get the first 20 results, which is a safe default.\n\nWant me to add tests for the new behavior?';
  for await (const token of streamText(success)) {
    cbs.onToken(msgId, token);
  }
  cbs.onDone(msgId);
}

export function makeMessage(role: Message['role'], content = ''): Message {
  return {
    id: makeId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    toolCalls: [],
  };
}
