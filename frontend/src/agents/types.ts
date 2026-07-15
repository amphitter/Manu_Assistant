import { CodeSymbol } from "@/core/parser/types";
import { SearchResult } from "@/core/search/ranking";

export interface AgentMessage {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
}

export interface AgentRequest {
  model: string;

  messages: AgentMessage[];
}

export interface AgentResponse {
  content: string;
}

export type ToolName =
  | "filesystem"
  | "terminal";

export type ToolAction =
  // -----------------------------
  // Filesystem
  // -----------------------------

  | "tree"
  | "read"
  | "search"
  | "write"
  | "create"
  | "delete"
  | "rename"
  | "mkdir"

  // -----------------------------
  // Terminal
  // -----------------------------

  | "run"
  | "stop"
  | "logs"
  | "list";

export interface ToolCall {
  // -----------------------------
  // Tool
  // -----------------------------

  tool: ToolName;

  action: ToolAction;

  // -----------------------------
  // Filesystem
  // -----------------------------

  path?: string;

  query?: string;

  content?: string;

  newPath?: string;

  // -----------------------------
  // Terminal
  // -----------------------------

  command?: string;

  processId?: number;

  cwd?: string;

  env?: Record<
    string,
    string
  >;
}

export interface ToolResult {
  success: boolean;

  tool: ToolName;

  action: ToolAction;

  content: string;

  query?: string;

  symbols?: CodeSymbol[];

  searchResults?: SearchResult[];

  processId?: number;

  exitCode?: number;

  stdout?: string;

  stderr?: string;

  duration?: number;
}