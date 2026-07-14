"use client";

import { memo } from "react";
import type { ChatMessage } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  message: ChatMessage;
}

function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex w-full justify-center">
        <div className="rounded-full border border-amber-500/20 bg-amber-500/[0.07] px-4 py-1.5 text-xs italic text-amber-200/70">
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[75%] rounded-2xl bg-indigo-600/95 px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm shadow-black/20">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="w-full max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed text-zinc-100">
        <MarkdownRenderer content={message.content} />
      </div>
    </div>
  );
}

export default memo(ChatBubble, (prev, next) => prev.message === next.message);