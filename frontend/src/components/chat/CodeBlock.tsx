"use client";

import { useEffect, useRef } from "react";

import hljs from "highlight.js";

import "highlight.js/styles/github-dark.css";

import CopyButton from "./CopyButton";

interface Props {
  language: string;
  code: string;
}

export default function CodeBlock({
  language,
  code,
}: Props) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-zinc-700">

      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2">

        <span className="text-xs uppercase tracking-wider text-zinc-400">
          {language}
        </span>

        <CopyButton text={code} />

      </div>

      <pre className="overflow-x-auto bg-zinc-950 p-4">
        <code
          ref={codeRef}
          className={`language-${language}`}
        >
          {code}
        </code>
      </pre>

    </div>
  );
}