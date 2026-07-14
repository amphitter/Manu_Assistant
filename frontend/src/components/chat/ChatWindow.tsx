"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat.store";
import ChatBubble from "./ChatBubble";

export default function ChatWindow() {
  const messages = useChatStore((state) => state.messages);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 min-h-0">
        <h2 className="font-heading text-3xl italic tracking-wide text-zinc-400">
          Manu
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Start a conversation to get going.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-10 [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.700)_transparent]">
      <div className="mx-auto flex w-full max-w-4xl flex-col space-y-8">
  {messages.map((message) => (
    <div
      key={message.id}
      className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
    >
      <ChatBubble message={message} />
    </div>
  ))}
  <div ref={bottomRef} />
</div>
    </div>
  );
}