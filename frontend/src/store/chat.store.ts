import { create } from "zustand";
import { chatService } from "@/services/chat/chat.service";
import { ChatMessage } from "@/types/chat";
import { useModelStore } from "./model.store";
interface ChatStore {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  async sendMessage(content: string) {
    if (!content.trim()) return;

    // User message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    // Empty assistant message (will be streamed into)
    const assistantId = crypto.randomUUID();

    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    // Add both messages immediately
    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      loading: true,
      error: null,
    }));

    try {
      // Exclude the empty assistant placeholder from history
      const history = get()
        .messages
        .filter(
          (m) => !(m.id === assistantId && m.content === "")
        )
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      await chatService.streamMessage({
        model: useModelStore.getState().selectedModel,

        messages: [
          {
            role: "system",
            content: `You are AGENTS.

You are an AI Operating System.

You specialize in:
- Software Engineering
- AI Development
- Web Development
- Data Structures & Algorithms
- Resume Optimization
- Job Applications

Rules:
- Always answer in Markdown.
- Always use fenced code blocks when writing code.
- Be concise but complete.
- Explain code only when necessary.
- Prefer production-ready solutions.
- Think step by step before answering.`,
          },

          ...history,
        ],

        onToken: (token: string) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: message.content + token,
                  }
                : message
            ),
          }));
        },
      });

      set({
        loading: false,
      });
    } catch (error) {
      console.error(error);

      set((state) => ({
        loading: false,
        error: "Failed to generate response.",
        messages: state.messages.filter(
          (message) => message.id !== assistantId
        ),
      }));
    }
  },

  clearMessages() {
    set({
      messages: [],
      loading: false,
      error: null,
    });
  },
}));