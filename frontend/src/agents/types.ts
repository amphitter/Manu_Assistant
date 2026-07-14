import { CodeSymbol } from "@/core/parser/types";
import { SearchResult } from "@/core/search/ranking";

export interface AgentMessage {
  role: "system" | "user" | "assistant";
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
  | "tree"
  | "read"
  | "search"
  | "write"
  | "create"
  | "delete"
  | "rename"
  | "mkdir"
  | "run";

export interface ToolCall {
  // Which tool should execute
  tool: ToolName;

  // Action for that tool
  action: ToolAction;

  // Existing file/folder path
  path?: string;

  // Search query
  query?: string;

  // Full file content (write/create)
  content?: string;

  // Rename destination
  newPath?: string;

  // Terminal command
  command?: string;
}

export interface ToolResult {
  success: boolean;

  tool: ToolName;

  action: ToolAction;

  content: string;

  query?: string;

  symbols?: CodeSymbol[];

  searchResults?: SearchResult[];
}