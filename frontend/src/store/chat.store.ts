import { create } from "zustand";

import {
  chatService,
  StreamEvent,
} from "@/services/chat/chat.service";

import { ChatMessage } from "@/types/chat";

import { useModelStore } from "./model.store";
import { useTerminalStore } from "./terminal.store";

interface ChatStore {
  messages: ChatMessage[];

  loading: boolean;

  error: string | null;

  sendMessage(
    content: string
  ): Promise<void>;

  clearMessages(): void;
}

const SYSTEM_PROMPT = `You are AGENTS.

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
- Think step by step before answering.`;

export const useChatStore =
  create<ChatStore>((set, get) => ({
    messages: [],

    loading: false,

    error: null,

    async sendMessage(
      content: string
    ) {
      if (!content.trim()) {
        return;
      }

      const userMessage: ChatMessage =
      {
        id: crypto.randomUUID(),

        role: "user",

        content,

        createdAt:
          Date.now(),
      };

      const assistantId =
        crypto.randomUUID();

      const assistantMessage: ChatMessage =
      {
        id: assistantId,

        role: "assistant",

        content: "",

        createdAt:
          Date.now(),
      };

      set((state) => ({
        messages: [
          ...state.messages,
          userMessage,
          assistantMessage,
        ],

        loading: true,

        error: null,
      }));

      try {
        const history =
          get()
            .messages.filter(
              (
                message
              ) =>
                !(
                  message.id ===
                  assistantId &&
                  message.content ===
                  ""
                )
            )
            .map(
              (
                message
              ) => ({
                role:
                  message.role,

                content:
                  message.content,
              })
            );

        await chatService.streamMessage(
          {
            model:
              useModelStore.getState()
                .selectedModel,

            messages: [
              {
                role:
                  "system",

                content:
                  SYSTEM_PROMPT,
              },

              ...history,
            ],

            onEvent: (
              event: StreamEvent
            ) => {
              switch (
              event.type
              ) {
                // --------------------------------
                // Assistant Stream
                // --------------------------------

                case "assistant": {
                  set(
                    (
                      state
                    ) => ({
                      messages:
                        state.messages.map(
                          (
                            message
                          ) =>
                            message.id ===
                              assistantId
                              ? {
                                ...message,

                                content:
                                  message.content +
                                  String(
                                    event.data ??
                                    ""
                                  ),
                              }
                              : message
                        ),
                    })
                  );

                  break;
                }

                // --------------------------------
                // Terminal Events
                // --------------------------------

                case "terminal": {
                  useTerminalStore
                    .getState()
                    .append(event.data);

                  break;
                }

                // --------------------------------
                // System Events
                // --------------------------------

                case "system": {
                  console.log(
                    "[System]",
                    event.data
                  );

                  break;
                }

                default:
                  break;
              }
            },
          }
        );

        set({
          loading: false,
        });
      } catch (error) {
        console.error(error);

        set(
          (
            state
          ) => ({
            loading: false,

            error:
              "Failed to generate response.",

            messages:
              state.messages.filter(
                (
                  message
                ) =>
                  message.id !==
                  assistantId
              ),
          })
        );
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