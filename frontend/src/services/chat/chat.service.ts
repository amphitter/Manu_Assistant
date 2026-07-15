import { MessageRole } from "@/types/chat";

export interface AIMessage {
  role: MessageRole;

  content: string;
}

export interface StreamEvent {
  type:
    | "assistant"
    | "terminal"
    | "system";

  data: any;
}

export interface StreamOptions {
  model?: string;

  messages: AIMessage[];

  onEvent(
    event: StreamEvent
  ): void;
}

export class ChatService {
  async streamMessage({
    model = "qwen3:4b",
    messages,
    onEvent,
  }: StreamOptions): Promise<void> {
    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model,
            messages,
          }),
        }
      );

    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status})`
      );
    }

    if (!response.body) {
      throw new Error(
        "Response body is empty."
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    try {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() ?? "";

        for (const line of lines) {
          const trimmed =
            line.trim();

          if (!trimmed) {
            continue;
          }

          try {
            const event: StreamEvent =
              JSON.parse(
                trimmed
              );

            onEvent(event);
          } catch {
            onEvent({
              type:
                "assistant",

              data: trimmed,
            });
          }
        }
      }

      const remaining =
        decoder.decode();

      if (remaining) {
        buffer += remaining;
      }

      if (buffer.trim()) {
        try {
          const event: StreamEvent =
            JSON.parse(
              buffer.trim()
            );

          onEvent(event);
        } catch {
          onEvent({
            type:
              "assistant",

            data:
              buffer.trim(),
          });
        }
      }
    } catch (error) {
      console.error(
        "[ChatService]",
        error
      );

      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}

export const chatService =
  new ChatService();