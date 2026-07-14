"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — fail silently, no UI break.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied to clipboard" : "Copy code"}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
        copied
          ? "text-emerald-400"
          : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span className="transition-transform duration-150">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </span>
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}