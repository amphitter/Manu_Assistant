export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: AIMessage[];
}

export interface AIModel {
  name: string;
  size?: number;
}