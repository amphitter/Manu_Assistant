"use client";

import type { ChatMessage } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  message: ChatMessage;
}

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`max-w-4xl rounded-xl p-4 ${
        isUser
          ? "ml-auto bg-blue-600 text-white"
          : isSystem
          ? "mx-auto border border-yellow-700 bg-yellow-900/30 text-yellow-200 italic"
          : "mr-auto bg-zinc-900 text-white"
      }`}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <MarkdownRenderer content={message.content} />
      )}
    </div>
  );
}