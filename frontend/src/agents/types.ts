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

export interface ToolCall {
  tool: string;
  action: string;
  path?: string;
  query?: string;
}

export interface ToolResult {
  success: boolean;
  tool: string;
  action: string;

  content: string;

  searchResults?: SearchResult[];
}