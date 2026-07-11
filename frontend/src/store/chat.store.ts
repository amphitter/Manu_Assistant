import { create } from "zustand";
import { chatService } from "@/services/chat/chat.service";
import { ChatMessage } from "@/types/chat";

interface ChatStore {
  messages: ChatMessage[];

  loading: boolean;

  sendMessage(content: string): Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],

  loading: false,

  async sendMessage(content) {
    if (!content.trim()) return;

    const user: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    const assistantId = crypto.randomUUID();

    set((state) => ({
      loading: true,
      messages: [
        ...state.messages,
        user,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
        },
      ],
    }));

    await chatService.streamMessage(
      [
        {
          role: "user",
          content,
        },
      ],
      (token) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content + token,
                }
              : m
          ),
        }));
      }
    );

    set({
      loading: false,
    });
  },
}));