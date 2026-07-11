export class ChatService {
  async streamMessage(
    messages: { role: string; content: string }[],
    onToken: (token: string) => void
  ) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages,
      }),
    });

    if (!response.body) {
      throw new Error("No response body.");
    }

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);

      onToken(chunk);
    }
  }
}

export const chatService = new ChatService();