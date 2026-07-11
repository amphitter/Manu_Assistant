"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CodeBlock from "./CodeBlock";

interface Props {
  content: string;
}

export default function MarkdownRenderer({
  content,
}: Props) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ children, className }) {
            const match = /language-(\w+)/.exec(
              className || ""
            );

            if (!match) {
              return (
                <code className="rounded bg-zinc-800 px-1 py-0.5">
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}