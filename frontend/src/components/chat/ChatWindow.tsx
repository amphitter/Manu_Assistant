"use client";

import { useChatStore } from "@/store/chat.store";

export default function ChatWindow() {
  const messages = useChatStore((s) => s.messages);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto w-fit rounded-xl bg-blue-600 px-4 py-3 text-white"
                : "mr-auto w-fit rounded-xl bg-zinc-800 px-4 py-3 text-white"
            }
          >
            {message.content}
          </div>
        ))}
      </div>
    </div>
  );
}