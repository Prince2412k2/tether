export interface Host {
  id: string;
  nickname: string;
  hostname: string;
  username: string;
  port: number;
  authMethod: 'key' | 'password';
  agentCommand: string;
  lastConnected?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber?: number;
}

export interface ToolCall {
  id: string;
  name: 'bash' | 'read_file' | 'write_file' | 'list_dir' | 'search' | 'unknown';
  status: 'running' | 'done' | 'error' | 'permission_needed' | 'denied';
  input: Record<string, string | number | boolean>;
  output?: string;
  diff?: DiffLine[];
  filePath?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  timestamp: string;
}

export interface Session {
  id: string;
  hostId: string;
  hostNickname: string;
  createdAt: string;
  messages: Message[];
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'handshaking'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface PendingPermission {
  toolCallId: string;
  messageId: string;
  toolName: string;
  command?: string;
  filePath?: string;
  diff?: DiffLine[];
}
