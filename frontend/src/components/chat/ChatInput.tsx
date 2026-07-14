"use client";

import { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { useChatStore } from "@/store/chat.store";

export default function ChatInput() {
  const [text, setText] = useState("");
  const send = useChatStore((s) => s.sendMessage);
  const loading = useChatStore((s) => s.loading);
  const isComposing = useRef(false);

  async function handleSend() {
    if (!text.trim()) return;
    await send(text);
    setText("");
  }

  const canSend = text.trim().length > 0 && !loading;

  return (
    <div className="px-6 pb-6 pt-2">
      <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 pl-4 shadow-sm shadow-black/20 transition-colors focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-600">
        <input
          className="flex-1 bg-transparent py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          placeholder="Message MANU..."
          value={text}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={() => {
            isComposing.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposing.current) {
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
            canSend
              ? "bg-zinc-100 text-zinc-900 hover:bg-white"
              : "bg-zinc-800 text-zinc-600"
          } disabled:cursor-not-allowed`}
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}