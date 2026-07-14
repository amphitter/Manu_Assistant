"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

interface Props {
  content: string;
}

function MarkdownRenderer({ content }: Props) {
  return (
    <div
      className="
        prose prose-invert max-w-none
        prose-p:leading-relaxed prose-p:text-zinc-200
        prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-zinc-100
        prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
        prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
        prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
        prose-strong:text-zinc-100 prose-strong:font-semibold
        prose-a:text-zinc-200 prose-a:underline prose-a:decoration-zinc-600 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-400
        prose-blockquote:border-l-2 prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400 prose-blockquote:font-normal prose-blockquote:not-italic
        prose-ul:text-zinc-200 prose-ol:text-zinc-200
        prose-li:my-1
        prose-hr:border-zinc-800
        prose-table:text-sm
        prose-th:border-zinc-800 prose-th:bg-zinc-900/60 prose-th:text-zinc-300
        prose-td:border-zinc-800
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ children, className }) {
            const match = /language-(\w+)/.exec(className || "");
            if (!match) {
              return (
                <code className="rounded-[4px] bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-200">
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock
                language={match[1]}
                code={String(children).replace(/\n$/, "")}
              />
            );
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownRenderer, (prev, next) => prev.content === next.content);