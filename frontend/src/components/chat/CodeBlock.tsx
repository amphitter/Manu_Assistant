"use client";

import { memo, useEffect, useRef } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import CopyButton from "./CopyButton";

interface Props {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: Props) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <div className="my-5 animate-in fade-in-0 duration-300 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm shadow-black/20">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-2">
        <span className="font-mono text-[11px] tracking-wide text-zinc-500">
          {language}
        </span>
        <CopyButton text={code} />
      </div>

      <pre className="overflow-x-auto p-4 [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.700)_transparent]">
        <code
          ref={codeRef}
          translate="no"
          className={`language-${language} font-mono text-[13px] leading-relaxed`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

export default memo(CodeBlock, (prev, next) => prev.code === next.code && prev.language === next.language);