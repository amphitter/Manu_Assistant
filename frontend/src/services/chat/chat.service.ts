import { MessageRole } from "@/types/chat";

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export interface StreamOptions {
  model?: string;
  messages: AIMessage[];
  onToken: (token: string) => void;
}

export class ChatService {
  async streamMessage({
    model = "qwen3:4b",
    messages,
    onToken,
  }: StreamOptions): Promise<void> {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    if (!response.body) {
      throw new Error("Response body is empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        onToken(decoder.decode(value, { stream: true }));
      }

      // Flush remaining buffered bytes
      const remaining = decoder.decode();

      if (remaining) {
        onToken(remaining);
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const chatService = new ChatService();