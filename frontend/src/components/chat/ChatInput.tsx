"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chat.store";

export default function ChatInput() {
  const [text, setText] = useState("");

  const send = useChatStore((s) => s.sendMessage);

  const loading = useChatStore((s) => s.loading);

  async function handleSend() {
    if (!text.trim()) return;

    await send(text);

    setText("");
  }

  return (
    <div className="flex gap-2 border-t p-5">
      <input
        className="flex-1 rounded-xl border bg-zinc-900 p-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-6"
      >
        Send
      </button>
    </div>
  );
}