# Tether

A mobile app (iOS first) that lets developers talk to a coding agent — Claude Code, opencode, Gemini CLI — running on their own remote dev box via SSH + ACP (Agent Client Protocol).

## Run & Operate

- `pnpm run dev` — run the Expo app
- `pnpm run typecheck` — typecheck the Expo app
- `pnpm run build` — build the Expo app
- Expo app: scan QR code in Replit URL bar with Expo Go to preview on device

## Stack

- pnpm workspace, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- State: React Context + AsyncStorage

## Where things live

- `artifacts/tether/` — Expo mobile app
- `artifacts/tether/app/(tabs)/index.tsx` — Hosts list home screen
- `artifacts/tether/app/session.tsx` — Chat/session screen
- `artifacts/tether/app/add-host.tsx` — Add host modal
- `artifacts/tether/lib/types.ts` — All TypeScript interfaces (Host, Session, Message, ToolCall, etc.)
- `artifacts/tether/lib/mockAcp.ts` — Mock ACP protocol simulation (replace with real SSH impl)
- `artifacts/tether/context/AppContext.tsx` — App-wide state with AsyncStorage persistence
- `artifacts/tether/components/` — MessageBubble, ToolCallCard, DiffView, PermissionPrompt, etc.
- `artifacts/tether/constants/colors.ts` — Dark/light theme tokens

## Architecture decisions

- **Frontend-only for MVP**: All state lives in AsyncStorage via AppContext.
- **Mock ACP layer**: `lib/mockAcp.ts` simulates a real agent session (streaming tokens, tool calls, permission prompts, diffs). Replace with a real SSH+JSON-RPC implementation for production.
- **Dark-first design**: `constants/colors.ts` has both `dark` and `light` keys; dark is the primary experience per the PRD.
- **No Zustand**: Kept React Context + AsyncStorage to avoid extra dependencies. Zustand can be added if state complexity grows.
- **Inverted FlatList for chat**: Messages stored newest-first; FlatList uses `inverted` prop. No `scrollToEnd()` — handles auto-scroll automatically.

## Product

- **Hosts**: Save SSH hosts (nickname, hostname, username, port, auth method, agent command). Long-press to delete.
- **Connect**: Tap a host to simulate SSH connection + ACP handshake, then enter a chat session.
- **Chat**: Send prompts to the agent; streaming responses appear token by token.
- **Tool calls**: Agent tool usage (bash, read_file, write_file) renders as collapsible cards with output.
- **Diff view**: File edits show unified diffs with syntax highlighting (red/green lines).
- **Permission prompts**: Write operations surface a permission sheet with Allow/Deny. Default focus on Deny per PRD.
- **Session history**: Recent sessions visible on the home screen; persisted across app restarts.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The SSH+ACP layer is mocked in `lib/mockAcp.ts`. Real SSH requires a native module (NMSSH/libssh2) which needs a bare React Native project, not Expo Go. See §7.2 of the PRD.
- Do NOT restart the Expo workflow for normal code changes — Metro HMR handles it. Only restart for dependency changes.
- `tether-bridge` daemon (Go, §7.3 of PRD) is not yet implemented — needed for real session persistence across SSH drops.

## Pointers

- ACP protocol spec: https://agentclientprotocol.com/protocol/overview
- Full PRD: `attached_assets/Pasted--PRD-Tether-Working-title-Tether-Tagline-Your-dev-box-s_1779079568689.txt`
