"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-md px-3 py-1 text-xs transition hover:bg-zinc-700"
    >
      {copied ? (
        <>
          <Check size={14} />
          Copied
        </>
      ) : (
        <>
          <Copy size={14} />
          Copy
        </>
      )}
    </button>
  );
}