export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  toolCalls?: { name: string; snippet: string }[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface Session {
  id: string;
  name: string;
  model: string;
  provider: string;
  messageCount: number;
  lastActive: number;
}

// Events from gro --output-format stream-json
export type GroEvent =
  | { type: "token"; token: string }
  | { type: "reasoning"; token: string }
  | { type: "state-vector"; state: Record<string, number> }
  | { type: "result"; result: string }
  | { type: "tool_call"; name: string; snippet: string }
  | { type: "api_usage"; input_tokens: number; output_tokens: number; input_kb: number; output_kb: number };

export type VimMode = "normal" | "insert";

export type Panel = "chat" | "sidebar";

export interface AppState {
  mode: VimMode;
  activePanel: Panel;
  scrollOffset: number;
}
