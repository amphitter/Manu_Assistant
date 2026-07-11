# AGENTS PROJECT EXPORT



=====================================================
FILE: agents\context\ContextBuilder.ts
=====================================================

```ts
import { filesystem } from "@/core/filesystem/local-filesystem";
import { extractor } from "@/core/parser/extractor";

import { ToolResult } from "../types";

export class ContextBuilder {
  async build(
    toolResults: ToolResult[],
    userMessage: string
  ): Promise<string> {
    const sections: string[] = [];

    for (const result of toolResults) {
      if (!result.success) continue;

      switch (result.action) {
        case "tree": {
          sections.push(`
====================
PROJECT TREE
====================

${result.content}
`);
          break;
        }

        case "read": {
          const extracted = extractor.extract(
            result.content,
            userMessage
          );

          sections.push(`
====================
FILE CONTENT
====================

${extracted}
`);
          break;
        }

       case "search": {
  const searchResults = result.searchResults ?? [];

  if (!searchResults.length) break;

  for (const file of searchResults.slice(0, 5)) {
    try {
      const raw = await filesystem.readFile(file.path);

      const extracted = extractor.extract(
        raw,
        userMessage
      );

      sections.push(`
====================
FILE: ${file.path}
====================

${extracted}
`);
    } catch (error) {
      console.error(error);
    }
  }

  break;
}
      }
    }

    if (!sections.length) return "";

    return `
The following project context was retrieved from the workspace.

Base your answer ONLY on this context.

If something is not present here, explicitly say it is unavailable.

${sections.join("\n")}
`;
  }
}

export const contextBuilder =
  new ContextBuilder();
```


=====================================================
FILE: agents\core\Agent.ts
=====================================================

```ts
import { provider } from "@/lib/ai";

import { Memory } from "./Memory";
import { Planner } from "./Planner";
import { PromptBuilder } from "./PromptBuilder";
import { ToolExecutor } from "./ToolExecutor";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentRequest,
  AgentMessage,
} from "../types";

export class Agent {
  private planner = new Planner();

  private memory = new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  async *chat(
    request: AgentRequest
  ) {
    // Always rebuild memory from the current request
    this.memory = new Memory();

    for (const message of request.messages) {
      this.memory.add(message);
    }

    const last =
      request.messages[
        request.messages.length - 1
      ];

    const plan =
      await this.planner.plan(
        last.content
      );

    console.log("\n========== PLAN ==========");
    console.dir(plan, {
      depth: null,
    });
    console.log("==========================\n");

    let toolContext = "";

    if (plan.toolCalls.length) {
      const results =
        await this.toolExecutor.execute(
          plan.toolCalls
        );

      console.log(
        "\n======= TOOL RESULTS ======="
      );
      console.dir(results, {
        depth: null,
      });
      console.log(
        "============================\n"
      );

      toolContext =
        await contextBuilder.build(
          results,
          last.content
        );
    }

    const messages: AgentMessage[] = [];

    // Context FIRST
    if (toolContext) {
      messages.push({
        role: "system",
        content: toolContext,
      });
    }

    // Then chat history
    messages.push(...this.memory.all());

    const prompt =
      this.promptBuilder.build(
        messages
      );

    console.log(
      "\n======= FINAL PROMPT ======="
    );

    console.log(
      prompt
        .map(
          (m) =>
            `[${m.role}]\n${m.content}`
        )
        .join("\n\n")
    );

    console.log(
      "============================\n"
    );

    for await (const token of provider.stream({
      model: request.model,
      messages: prompt,
    })) {
      yield token;
    }
  }
}

export const agent = new Agent();
```


=====================================================
FILE: agents\core\Memory.ts
=====================================================

```ts
import { AgentMessage } from "../types";

export class Memory {

  private messages: AgentMessage[] = [];

  add(message: AgentMessage) {
    this.messages.push(message);
  }

  all() {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
  }

}
```


=====================================================
FILE: agents\core\Planner.ts
=====================================================

```ts
import ollama from "ollama";

import { ToolCall } from "../types";
import { PLANNER_PROMPT } from "../prompts/planner.prompt";

export interface Plan {
  toolCalls: ToolCall[];
}

export class Planner {
  async plan(message: string): Promise<Plan> {
    const response = await ollama.chat({
      model: "qwen3:4b",
      stream: false,
      messages: [
        {
          role: "system",
          content: PLANNER_PROMPT,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    console.log("\n========== PLANNER ==========");
    console.log(response.message.content);
    console.log("=============================\n");

    try {
      return JSON.parse(response.message.content);
    } catch (error) {
      console.error("Planner JSON Error:", error);

      return {
        toolCalls: [],
      };
    }
  }
}
```


=====================================================
FILE: agents\core\PromptBuilder.ts
=====================================================

```ts
import { AgentMessage } from "../types";

export class PromptBuilder {
    build(
        messages: AgentMessage[]
    ): AgentMessage[] {
        return [
            {
                role: "system",
                content: `You are AGENTS.

You are a local AI Operating System.

When project context is supplied:

- NEVER ignore it.

- NEVER invent code.

- Base every answer on the provided files.

If context is missing,
say so.

Return markdown.

Use production-quality code.`
            },

            ...messages,
        ];
    }
}
```


=====================================================
FILE: agents\core\ToolExecutor.ts
=====================================================

```ts
import { ToolCall } from "../types";
import { toolRegistry } from "../tools/registry";

export class ToolExecutor {
  async execute(
    calls: ToolCall[]
  ) {
    const results = [];

    for (const call of calls) {
      const tool =
        toolRegistry[
          call.tool as keyof typeof toolRegistry
        ];

      if (!tool) continue;

      const result =
        await tool.execute(call);

      results.push(result);
    }

    return results;
  }
}
```


=====================================================
FILE: agents\prompts\planner.prompt.ts
=====================================================

```ts
export const PLANNER_PROMPT = `
You are the planning engine for an AI Operating System.

Your ONLY job is deciding which tools must run.

Never answer the user.

Return ONLY VALID JSON.

Schema

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"tree"
    }
  ]
}

Available Tool

filesystem

Available Actions

tree
read
search

------------------------------------------------

Rules

1.
If the user asks about the project structure,
workspace,
folders,
tree,
architecture

-> use tree

Examples

Show my project

Project tree

Workspace

Folder structure

Architecture

-----------------------------------------

2.
If the user mentions a FILE PATH

Examples

src/store/chat.store.ts

package.json

Planner.ts

app/layout.tsx

or asks

Read
Open
Explain this file
Summarize this file

-> use read

Example

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"read",
      "path":"src/store/chat.store.ts"
    }
  ]
}

-----------------------------------------

3.
If the user asks about ANY SYMBOL

Examples

Explain sendMessage()

Explain Planner

Where is Agent class

Memory class

PromptBuilder

WorkspaceExplorer

ToolExecutor

rankResults

chat()

stream()

parse()

build()

ContextBuilder

extract()

NEVER return empty.

Use SEARCH.

Example

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"search",
      "query":"sendMessage"
    }
  ]
}

-----------------------------------------

4.

If the user asks

Where is ...

Find ...

Locate ...

Search ...

-> use search

-----------------------------------------

5.

Multiple tools are allowed.

Example

Explain sendMessage()

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"search",
      "query":"sendMessage"
    }
  ]
}

-----------------------------------------

Example

Read package.json

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"read",
      "path":"package.json"
    }
  ]
}

-----------------------------------------

Example

Show workspace tree

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"tree"
    }
  ]
}

-----------------------------------------

Only when the request is pure conversation
like

Hello

Hi

Thanks

Who are you

can you return

{
  "toolCalls":[]
}

Return ONLY JSON.

No markdown.

No explanation.
`;
```


=====================================================
FILE: agents\tools\filesystem.tool.ts
=====================================================

```ts
import { filesystem } from "@/core/filesystem/local-filesystem";
import { workspaceSearch } from "@/core/search/search";

import {
  ToolCall,
  ToolResult,
} from "../types";

export class FilesystemTool {
  readonly name = "filesystem";

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    try {
      switch (call.action) {
        case "tree": {
          const tree =
            await filesystem.getTree();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content: JSON.stringify(
              tree,
              null,
              2
            ),
          };
        }

        case "read": {
          if (!call.path) {
            return {
              success: false,
              tool: this.name,
              action: call.action,
              content: "Missing file path.",
            };
          }

          const content =
            await filesystem.readFile(
              call.path
            );

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content,
          };
        }

        case "search": {
          if (!call.query) {
            return {
              success: false,
              tool: this.name,
              action: call.action,
              content: "Missing search query.",
            };
          }

          const results =
  await workspaceSearch.search(
    call.query
  );

if (!results.length) {
  return {
    success: false,
    tool: this.name,
    action: call.action,
    content: "No matching files found.",
  };
}

return {
  success: true,
  tool: this.name,
  action: call.action,
  content: "",
  searchResults: results,
};

          const formatted = results
            .slice(0, 10)
            .map(
              (file, index) => `
${index + 1}. ${file.path}
Score: ${file.score}
`
            )
            .join("\n");

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content: formatted,
          };
        }

        default:
          return {
            success: false,
            tool: this.name,
            action: call.action,
            content:
              "Unknown filesystem action.",
          };
      }
    } catch (error) {
      console.error(error);

      return {
        success: false,
        tool: this.name,
        action: call.action,
        content:
          "Filesystem execution failed.",
      };
    }
  }
}

export const filesystemTool =
  new FilesystemTool();
```


=====================================================
FILE: agents\tools\registry.ts
=====================================================

```ts
import { filesystemTool } from "./filesystem.tool";

export const toolRegistry = {
  filesystem: filesystemTool,
};

export type ToolName =
  keyof typeof toolRegistry;
```


=====================================================
FILE: agents\types.ts
=====================================================

```ts
import { SearchResult } from "@/core/search/ranking";
export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  model: string;
  messages: AgentMessage[];
}

export interface AgentResponse {
  content: string;
}

export interface ToolCall {
  tool: string;
  action: string;
  path?: string;
  query?: string;
}

export interface ToolResult {
  success: boolean;
  tool: string;
  action: string;

  content: string;

  searchResults?: SearchResult[];
}
```


=====================================================
FILE: app\api\chat\route.ts
=====================================================

```ts
import { NextRequest } from "next/server";
import { agent } from "@/agents/core/Agent";

export async function POST(req: NextRequest) {
  try {
    const { model, messages } = await req.json();

    console.log("Using Model:", model);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of agent.chat({
            model,
            messages,
          })) {
            controller.enqueue(
              encoder.encode(token)
            );
          }
        } catch (error) {
          console.error("Streaming Error:", error);

          controller.enqueue(
            encoder.encode(
              "\n\n❌ Internal server error."
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Request Error:", error);

    return Response.json(
      {
        success: false,
        error: "Invalid request.",
      },
      {
        status: 400,
      }
    );
  }
}
```


=====================================================
FILE: app\api\health\route.ts
=====================================================

```ts
import { NextResponse } from "next/server";

import { provider } from "@/lib/ai";

export async function GET() {
  const healthy = await provider.health();

  return NextResponse.json({
    success: healthy,
  });
}
```


=====================================================
FILE: app\api\models\route.ts
=====================================================

```ts
import { NextResponse } from "next/server";
import ollama from "ollama";

export async function GET() {
  try {
    const models = await ollama.list();

    return NextResponse.json({
      success: true,
      models: models.models.map((model) => ({
        id: model.model,
        name: model.model,
        size: model.size,
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        models: [],
      },
      {
        status: 500,
      }
    );
  }
}
```


=====================================================
FILE: app\api\workspace\file\route.ts
=====================================================

```ts
import { NextRequest, NextResponse } from "next/server";
import { filesystem } from "@/core/filesystem/local-filesystem";

export async function GET(req: NextRequest) {
  try {
    const filePath =
      req.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing path.",
        },
        {
          status: 400,
        }
      );
    }

    const content =
      await filesystem.readFile(filePath);

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to read file.",
      },
      {
        status: 500,
      }
    );
  }
}
```


=====================================================
FILE: app\api\workspace\search\route.ts
=====================================================

```ts
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { workspaceSearch } from "@/core/search/search";

export async function GET(
  req: NextRequest
) {
  try {
    const query =
      req.nextUrl.searchParams.get(
        "query"
      );

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          results: [],
        },
        {
          status: 400,
        }
      );
    }

    const results =
      await workspaceSearch.search(query);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        results: [],
      },
      {
        status: 500,
      }
    );
  }
}
```


=====================================================
FILE: app\api\workspace\tree\route.ts
=====================================================

```ts
import { NextResponse } from "next/server";
import { filesystem } from "@/core/filesystem/local-filesystem";

export async function GET() {
  try {
    const tree = await filesystem.getTree();

    return NextResponse.json({
      success: true,
      tree,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        tree: [],
      },
      {
        status: 500,
      }
    );
  }
}
```


=====================================================
FILE: app\globals.css
=====================================================

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-heading);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.147 0.004 49.3);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.147 0.004 49.3);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.147 0.004 49.3);
  --primary: oklch(0.214 0.009 43.1);
  --primary-foreground: oklch(0.986 0.002 67.8);
  --secondary: oklch(0.96 0.002 17.2);
  --secondary-foreground: oklch(0.214 0.009 43.1);
  --muted: oklch(0.96 0.002 17.2);
  --muted-foreground: oklch(0.547 0.021 43.1);
  --accent: oklch(0.96 0.002 17.2);
  --accent-foreground: oklch(0.214 0.009 43.1);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.005 34.3);
  --input: oklch(0.922 0.005 34.3);
  --ring: oklch(0.714 0.014 41.2);
  --chart-1: oklch(0.868 0.007 39.5);
  --chart-2: oklch(0.547 0.021 43.1);
  --chart-3: oklch(0.438 0.017 39.3);
  --chart-4: oklch(0.367 0.016 35.7);
  --chart-5: oklch(0.268 0.011 36.5);
  --radius: 0.625rem;
  --sidebar: oklch(0.986 0.002 67.8);
  --sidebar-foreground: oklch(0.147 0.004 49.3);
  --sidebar-primary: oklch(0.214 0.009 43.1);
  --sidebar-primary-foreground: oklch(0.986 0.002 67.8);
  --sidebar-accent: oklch(0.96 0.002 17.2);
  --sidebar-accent-foreground: oklch(0.214 0.009 43.1);
  --sidebar-border: oklch(0.922 0.005 34.3);
  --sidebar-ring: oklch(0.714 0.014 41.2);
}

.dark {
  --background: oklch(0.147 0.004 49.3);
  --foreground: oklch(0.986 0.002 67.8);
  --card: oklch(0.214 0.009 43.1);
  --card-foreground: oklch(0.986 0.002 67.8);
  --popover: oklch(0.214 0.009 43.1);
  --popover-foreground: oklch(0.986 0.002 67.8);
  --primary: oklch(0.922 0.005 34.3);
  --primary-foreground: oklch(0.214 0.009 43.1);
  --secondary: oklch(0.268 0.011 36.5);
  --secondary-foreground: oklch(0.986 0.002 67.8);
  --muted: oklch(0.268 0.011 36.5);
  --muted-foreground: oklch(0.714 0.014 41.2);
  --accent: oklch(0.268 0.011 36.5);
  --accent-foreground: oklch(0.986 0.002 67.8);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.547 0.021 43.1);
  --chart-1: oklch(0.868 0.007 39.5);
  --chart-2: oklch(0.547 0.021 43.1);
  --chart-3: oklch(0.438 0.017 39.3);
  --chart-4: oklch(0.367 0.016 35.7);
  --chart-5: oklch(0.268 0.011 36.5);
  --sidebar: oklch(0.214 0.009 43.1);
  --sidebar-foreground: oklch(0.986 0.002 67.8);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.986 0.002 67.8);
  --sidebar-accent: oklch(0.268 0.011 36.5);
  --sidebar-accent-foreground: oklch(0.986 0.002 67.8);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.547 0.021 43.1);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```


=====================================================
FILE: app\layout.tsx
=====================================================

```tsx
import type { Metadata } from "next";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "AGENTS",
  description: "Local AI Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
```


=====================================================
FILE: app\page.tsx
=====================================================

```tsx
import AppShell from "@/components/layout/AppShell";

export default function HomePage() {
    return <AppShell />;
}
```


=====================================================
FILE: components\chat\ChatBubble.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\ChatInput.tsx
=====================================================

```tsx
"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chat.store";

export default function ChatInput() {
  const [text, setText] = useState("");

  const send = useChatStore((s) => s.sendMessage);

  const loading = useChatStore((s) => s.loading);

  async function handleSend() {
    if (!text.trim()) return;

    await send(text);

    setText("");
  }

  return (
    <div className="flex gap-2 border-t p-5">
      <input
        className="flex-1 rounded-xl border bg-zinc-900 p-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-6"
      >
        Send
      </button>
    </div>
  );
}
```


=====================================================
FILE: components\chat\ChatMessage.tsx
=====================================================

```tsx

```


=====================================================
FILE: components\chat\ChatWindow.tsx
=====================================================

```tsx
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```


=====================================================
FILE: components\chat\CodeBlock.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\CopyButton.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\MarkdownRenderer.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\ModelSelector.tsx
=====================================================

```tsx
"use client";

import { useEffect } from "react";
import { useModelStore } from "@/store/model.store";

export default function ModelSelector() {
  const {
    models,
    selectedModel,
    loadModels,
    setSelectedModel,
  } = useModelStore();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <select
      value={selectedModel}
      onChange={(e) =>
        setSelectedModel(e.target.value)
      }
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
    >
      {models.map((model) => (
        <option
          key={model.id}
          value={model.id}
        >
          {model.name}
        </option>
      ))}
    </select>
  );
}
```


=====================================================
FILE: components\layout\AppShell.tsx
=====================================================

```tsx
import Sidebar from "../sidebar/Sidebar";
import MainLayout from "./MainLayout";

export default function AppShell() {
    return (
        <div className="flex h-screen">

            <Sidebar />

            <MainLayout />

        </div>
    );
}
```


=====================================================
FILE: components\layout\Header.tsx
=====================================================

```tsx
import ModelSelector from "@/components/chat/ModelSelector";
export default function Header() {
    return (
        <header className="flex h-16 items-center justify-between border-b px-6">
            
<ModelSelector />
            

        </header>
    );
}
```


=====================================================
FILE: components\layout\MainLayout.tsx
=====================================================

```tsx
import Header from "./Header";
import ChatWindow from "../chat/ChatWindow";
import ChatInput from "../chat/ChatInput";

export default function MainLayout() {
    return (
        <div className="flex flex-1 flex-col">

            <Header />

            <ChatWindow />

            <ChatInput />

        </div>
    );
}
```


=====================================================
FILE: components\sidebar\Sidebar.tsx
=====================================================

```tsx
import SidebarHeader from "./SidebarHeader";
import SidebarContent from "./SidebarContent";
import SidebarFooter from "./SidebarFooter";

export default function Sidebar() {
    return (
        <aside className="flex h-screen w-72 flex-col border-r bg-zinc-950">
            <SidebarHeader />

            <div className="flex-1 overflow-auto">
                <SidebarContent />
            </div>

            <SidebarFooter />
        </aside>
    );
}
```


=====================================================
FILE: components\sidebar\SidebarContent.tsx
=====================================================

```tsx
"use client";

import { useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MessageSquare,
  Settings,
} from "lucide-react";

import WorkspaceExplorer from "@/features/workspace/components/WorkspaceExplorer";

export default function SidebarContent() {
  const [workspaceOpen, setWorkspaceOpen] =
    useState(true);

  return (
    <div className="flex h-full flex-col">

      {/* New Chat */}

      <button className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800">
        <MessageSquare size={18} />
        <span>New Chat</span>
      </button>

      {/* Workspace */}

      <button
        onClick={() =>
          setWorkspaceOpen(!workspaceOpen)
        }
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-3 transition hover:bg-zinc-800"
      >
        {workspaceOpen ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}

        <FolderOpen size={18} />

        <span>Workspace</span>
      </button>

      {workspaceOpen && (
        <div className="ml-3 mt-2">
          <WorkspaceExplorer />
        </div>
      )}

      {/* Settings */}

      <button className="mt-auto flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800">
        <Settings size={18} />
        <span>Settings</span>
      </button>
    </div>
  );
}
```


=====================================================
FILE: components\sidebar\SidebarFooter.tsx
=====================================================

```tsx
export default function SidebarFooter() {
    return (
        <div className="border-t p-4 text-sm text-zinc-400">
            Local AI Workspace
        </div>
    );
}
```


=====================================================
FILE: components\sidebar\SidebarHeader.tsx
=====================================================

```tsx
export default function SidebarHeader() {
    return (
        <div className="border-b p-5">
            <h1 className="text-2xl font-bold tracking-wide">
                AGENTS
            </h1>
        </div>
    );
}
```


=====================================================
FILE: components\ui\avatar.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}

```


=====================================================
FILE: components\ui\badge.tsx
=====================================================

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-none border-0 bg-transparent px-0 py-0 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "text-foreground [a]:hover:text-foreground/70",
        secondary: "text-muted-foreground [a]:hover:text-foreground",
        destructive:
          "text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:text-destructive/70",
        outline: "text-foreground [a]:hover:text-foreground/70",
        ghost: "text-muted-foreground hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

```


=====================================================
FILE: components\ui\button.tsx
=====================================================

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```


=====================================================
FILE: components\ui\card.tsx
=====================================================

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 [--card-spacing:--spacing(8)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(5)] *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider uppercase",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```


=====================================================
FILE: components\ui\command.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("top-1/3 translate-y-0 overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1">
      <InputGroup className="border-transparent border-b-input bg-transparent px-3">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full px-2 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-3.5 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1.5 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:uppercase",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-none px-3 py-2 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

```


=====================================================
FILE: components\ui\dialog.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-none bg-popover p-6 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-5 right-5 bg-secondary"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold tracking-wider uppercase",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

```


=====================================================
FILE: components\ui\dropdown-menu.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronRightIcon } from "lucide-react"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-none bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-2.5 rounded-none px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase data-inset:pl-9.5",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-none px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn("z-50 min-w-36 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-none bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}

```


=====================================================
FILE: components\ui\input-group.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-10 w-full min-w-0 items-center rounded-none border border-transparent border-b-input bg-transparent transition-[color,border-color] outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-none has-data-[align=block-start]:rounded-none has-[[data-slot=input-group-control]:focus-visible]:border-b-ring has-[[data-slot][aria-invalid=true]]:border-b-destructive has-[textarea]:rounded-none has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:has-[[data-slot][aria-invalid=true]]:border-b-destructive/50 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-none **:data-[slot=kbd]:bg-muted-foreground/10 **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      align: {
        "inline-start": "order-first",
        "inline-end": "order-last",
        "block-start":
          "order-first w-full justify-start pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5",
        "block-end":
          "order-last w-full justify-start pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 rounded-none text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-none px-1.5 text-xs [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs": "size-6 p-0 text-xs has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 border-0 bg-transparent ring-0 group-has-[>[data-align=inline-end]]/input-group:pr-2 group-has-[>[data-align=inline-start]]/input-group:pl-2 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none border-0 bg-transparent py-2.5 ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}

```


=====================================================
FILE: components\ui\input.tsx
=====================================================

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border border-transparent border-b-input bg-transparent px-0 py-1 text-base transition-[color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-b-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```


=====================================================
FILE: components\ui\scroll-area.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-none bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }

```


=====================================================
FILE: components\ui\separator.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }

```


=====================================================
FILE: components\ui\sheet.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-md transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-4 right-4 bg-secondary"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-8", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-8", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider text-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```


=====================================================
FILE: components\ui\skeleton.tsx
=====================================================

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

```


=====================================================
FILE: components\ui\tabs.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-transparent px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap text-foreground/60 uppercase transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-4 group-data-vertical/tabs:py-2 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }

```


=====================================================
FILE: components\ui\textarea.tsx
=====================================================

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-none border border-transparent border-b-input bg-transparent px-0 py-3 text-base transition-[color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

```


=====================================================
FILE: components\ui\tooltip.tsx
=====================================================

```tsx
"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-none bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-none bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }

```


=====================================================
FILE: config\app.ts
=====================================================

```ts
export const APP_NAME = "AGENTS";

export const APP_DESCRIPTION = "Local AI Workspace";

export const SIDEBAR_WIDTH = 280;
```


=====================================================
FILE: constants\navigation.ts
=====================================================

```ts
import {
  MessageSquare,
  FolderOpen,
  Settings,
} from "lucide-react";

export const NAVIGATION = [
  {
    title: "Chat",
    icon: MessageSquare,
  },
  {
    title: "Workspace",
    icon: FolderOpen,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];
```


=====================================================
FILE: core\filesystem\filesystem.ts
=====================================================

```ts
import { WorkspaceNode } from "./types";

export interface FileSystemProvider {
  getTree(root: string): Promise<WorkspaceNode[]>;

  readFile(path: string): Promise<string>;
}
```


=====================================================
FILE: core\filesystem\ignore.ts
=====================================================

```ts
export const IGNORE_FOLDERS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".idea",
  ".vscode",
]);

export const IGNORE_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",
]);
```


=====================================================
FILE: core\filesystem\local-filesystem.ts
=====================================================

```ts
import fs from "fs/promises";
import path from "path";

import { FileSystemProvider } from "./filesystem";
import { WorkspaceNode } from "./types";
import { IGNORE_FILES, IGNORE_FOLDERS } from "./ignore";

export class LocalFileSystem implements FileSystemProvider {
  private readonly workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.resolve(
      process.env.WORKSPACE_ROOT || process.cwd()
    );
  }

  private validate(target: string): string {
    const resolved = path.resolve(target);

    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error("Access denied.");
    }

    return resolved;
  }

  async getTree(root?: string): Promise<WorkspaceNode[]> {
    const directory = this.validate(root || this.workspaceRoot);

    return this.walk(directory);
  }

  private async walk(directory: string): Promise<WorkspaceNode[]> {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    const nodes: WorkspaceNode[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE_FOLDERS.has(entry.name)) continue;
      } else {
        if (IGNORE_FILES.has(entry.name)) continue;
      }

      const absolute = path.join(directory, entry.name);

      const node: WorkspaceNode = {
        name: entry.name,
        path: absolute,
        type: entry.isDirectory() ? "folder" : "file",
      };

      if (entry.isDirectory()) {
        node.children = await this.walk(absolute);
      }

      nodes.push(node);
    }

    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }

      return a.type === "folder" ? -1 : 1;
    });

    return nodes;
  }

  async readFile(filePath: string): Promise<string> {
    const safe = this.validate(filePath);

    return fs.readFile(safe, "utf8");
  }
}

export const filesystem = new LocalFileSystem();
```


=====================================================
FILE: core\filesystem\types.ts
=====================================================

```ts
export type NodeType = "file" | "folder";

export interface WorkspaceNode {
  name: string;
  path: string;
  type: NodeType;
  children?: WorkspaceNode[];
}
```


=====================================================
FILE: core\parser\extractor.ts
=====================================================

```ts
import { codeParser } from "./parser";

export class ContextExtractor {
  extract(
    content: string,
    query: string
  ) {
    const symbols =
      codeParser.parse(content);

    const lower =
      query.toLowerCase();

    for (const symbol of symbols) {
      if (
        symbol.name
          .toLowerCase()
          .includes(lower)
      ) {
        return symbol.code;
      }
    }

    return content;
  }
}

export const extractor =
  new ContextExtractor();
```


=====================================================
FILE: core\parser\parser.ts
=====================================================

```ts
import { CodeSymbol } from "./types";

export class CodeParser {
  parse(content: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    const lines = content.split("\n");

    const patterns = [
      {
        type: "function",
        regex:
          /(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)/,
      },
      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/,
      },
      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?.*=>/,
      },
      {
        type: "class",
        regex:
          /(export\s+)?class\s+([A-Za-z0-9_]+)/,
      },
      {
        type: "interface",
        regex:
          /interface\s+([A-Za-z0-9_]+)/,
      },
      {
        type: "type",
        regex:
          /type\s+([A-Za-z0-9_]+)/,
      },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);

        if (!match) continue;

        const name =
          match[3] ??
          match[2] ??
          match[1];

        if (!name) continue;

        symbols.push({
          type: pattern.type as any,
          name,
          start: i,
          end: Math.min(lines.length - 1, i + 120),
          code: lines
            .slice(i, i + 120)
            .join("\n"),
        });

        break;
      }
    }

    return symbols;
  }
}

export const codeParser =
  new CodeParser();
```


=====================================================
FILE: core\parser\types.ts
=====================================================

```ts
export interface CodeSymbol {
  type:
    | "function"
    | "class"
    | "interface"
    | "type"
    | "variable";

  name: string;

  start: number;

  end: number;

  code: string;
}
```


=====================================================
FILE: core\search\cache.ts
=====================================================

```ts
import {
  workspaceIndexer,
  IndexedFile,
} from "./indexer";

let cache: IndexedFile[] = [];
let indexed = false;

export async function getIndex(): Promise<IndexedFile[]> {
  if (!indexed) {
    cache = await workspaceIndexer.build();
    indexed = true;
  }

  return cache;
}

export function invalidateIndex() {
  indexed = false;
  cache = [];
}
```


=====================================================
FILE: core\search\indexer.ts
=====================================================

```ts
import fs from "fs/promises";
import path from "path";

import {
  IGNORE_FILES,
  IGNORE_FOLDERS,
} from "@/core/filesystem/ignore";

export interface IndexedFile {
  name: string;
  path: string;
  content: string;
}

export class WorkspaceIndexer {
  private readonly root: string;

  constructor() {
    this.root = path.resolve(
      process.env.WORKSPACE_ROOT || process.cwd()
    );
  }

  async build(): Promise<IndexedFile[]> {
    const files: IndexedFile[] = [];

    await this.walk(this.root, files);

    return files;
  }

  private async walk(
    directory: string,
    files: IndexedFile[]
  ) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORE_FOLDERS.has(entry.name)
      ) {
        continue;
      }

      if (
        entry.isFile() &&
        IGNORE_FILES.has(entry.name)
      ) {
        continue;
      }

      const absolute = path.join(
        directory,
        entry.name
      );

      if (entry.isDirectory()) {
        await this.walk(absolute, files);
        continue;
      }

      try {
        const content = await fs.readFile(
          absolute,
          "utf8"
        );

        files.push({
          name: entry.name,
          path: absolute,
          content,
        });
      } catch {}
    }
  }
}

export const workspaceIndexer =
  new WorkspaceIndexer();
```


=====================================================
FILE: core\search\ranking.ts
=====================================================

```ts
import { IndexedFile } from "./indexer";

export interface SearchResult
  extends IndexedFile {
  score: number;
}

export function rankResults(
  files: IndexedFile[],
  query: string
): SearchResult[] {
  const q = query.toLowerCase();

  return files
    .map((file) => {
      let score = 0;

      if (
        file.name.toLowerCase().includes(q)
      )
        score += 100;

      if (
        file.path.toLowerCase().includes(q)
      )
        score += 50;

      if (
        file.content.toLowerCase().includes(q)
      )
        score += 10;

      return {
        ...file,
        score,
      };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
}
```


=====================================================
FILE: core\search\search.ts
=====================================================

```ts
import { getIndex } from "./cache";
import {
  rankResults,
  SearchResult,
} from "./ranking";

export class WorkspaceSearch {
  async search(
    query: string
  ): Promise<SearchResult[]> {
    const files = await getIndex();

    return rankResults(files, query);
  }
}

export const workspaceSearch =
  new WorkspaceSearch();
```


=====================================================
FILE: features\workspace\components\FileIcon.tsx
=====================================================

```tsx
"use client";

import { File, Folder, FolderOpen } from "lucide-react";

interface Props {
  type: "file" | "folder";
  expanded?: boolean;
}

export default function FileIcon({
  type,
  expanded = false,
}: Props) {
  if (type === "file") {
    return <File size={16} className="shrink-0" />;
  }

  return expanded ? (
    <FolderOpen size={16} className="shrink-0 text-yellow-400" />
  ) : (
    <Folder size={16} className="shrink-0 text-yellow-400" />
  );
}
```


=====================================================
FILE: features\workspace\components\WorkspaceExplorer.tsx
=====================================================

```tsx
"use client";

import { useEffect } from "react";

import WorkspaceNode from "./WorkspaceNode";

import { useWorkspaceStore } from "../store/workspace.store";

export default function WorkspaceExplorer() {
  const tree =
    useWorkspaceStore(
      (s) => s.tree
    );

  const loadTree =
    useWorkspaceStore(
      (s) => s.loadTree
    );

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="h-full overflow-y-auto p-2">

      {tree.map((node) => (
        <WorkspaceNode
          key={node.path}
          node={node}
        />
      ))}

    </div>
  );
}
```


=====================================================
FILE: features\workspace\components\WorkspaceNode.tsx
=====================================================

```tsx
"use client";

import { useState } from "react";

import FileIcon from "./FileIcon";

import {
  WorkspaceNode as Node,
} from "../services/workspace.service";

import { useWorkspaceStore } from "../store/workspace.store";

interface Props {
  node: Node;
}

export default function WorkspaceNode({
  node,
}: Props) {
  const [expanded, setExpanded] =
    useState(false);

  const openFile =
    useWorkspaceStore(
      (s) => s.openFile
    );

  const isFolder =
    node.type === "folder";

  return (
    <div>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-zinc-800"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            openFile(node.path);
          }
        }}
      >
        <FileIcon
          type={node.type}
          expanded={expanded}
        />

        <span className="truncate">
          {node.name}
        </span>

      </button>

      {expanded &&
        node.children?.map((child) => (
          <div
            key={child.path}
            className="ml-5"
          >
            <WorkspaceNode
              node={child}
            />
          </div>
        ))}
    </div>
  );
}
```


=====================================================
FILE: features\workspace\services\workspace.service.ts
=====================================================

```ts
export interface WorkspaceNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: WorkspaceNode[];
}

class WorkspaceService {
  async getTree(): Promise<WorkspaceNode[]> {
    const response = await fetch("/api/workspace/tree");

    if (!response.ok) {
      throw new Error("Failed to load workspace.");
    }

    const data = await response.json();

    return data.tree;
  }

  async readFile(path: string): Promise<string> {
    const response = await fetch(
      `/api/workspace/file?path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      throw new Error("Failed to read file.");
    }

    const data = await response.json();

    return data.content;
  }
}

export const workspaceService =
  new WorkspaceService();
```


=====================================================
FILE: features\workspace\store\workspace.store.ts
=====================================================

```ts
import { create } from "zustand";

import {
  WorkspaceNode,
  workspaceService,
} from "../services/workspace.service";

interface WorkspaceStore {
  tree: WorkspaceNode[];

  selectedFile: string | null;

  fileContent: string;

  loadTree(): Promise<void>;

  openFile(path: string): Promise<void>;
}

export const useWorkspaceStore =
  create<WorkspaceStore>((set) => ({
    tree: [],

    selectedFile: null,

    fileContent: "",

    async loadTree() {
      try {
        const tree =
          await workspaceService.getTree();

        set({
          tree,
        });
      } catch (error) {
        console.error(error);
      }
    },

    async openFile(path: string) {
      try {
        const content =
          await workspaceService.readFile(path);

        set({
          selectedFile: path,
          fileContent: content,
        });
      } catch (error) {
        console.error(error);
      }
    },
  }));
```


=====================================================
FILE: lib\ai.ts
=====================================================

```ts
import { aiRegistry } from "@/services/ai";
import { OllamaProvider } from "@/services/ai/ollama.provider";

const provider = new OllamaProvider();

aiRegistry.register(provider);

export { provider };
```


=====================================================
FILE: lib\cn.ts
=====================================================

```ts
export { cn } from "@/lib/utils";
```


=====================================================
FILE: lib\utils.ts
=====================================================

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```


=====================================================
FILE: services\ai\index.ts
=====================================================

```ts
export * from "./provider";
export * from "./registry";
export * from "./types";
```


=====================================================
FILE: services\ai\ollama.provider.ts
=====================================================

```ts
import ollama from "ollama";

import { AIProvider } from "./provider";
import {
  AIModel,
  ChatCompletionRequest,
} from "./types";

export class OllamaProvider implements AIProvider {

  async chat(request: ChatCompletionRequest): Promise<string> {
    const response = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: false,
    });

    return response.message.content;
  }

  async *stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string> {

    const stream = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: true,
    });

    for await (const chunk of stream) {
      yield chunk.message.content;
    }
  }

  async listModels(): Promise<AIModel[]> {
    const models = await ollama.list();

    return models.models.map((m) => ({
      name: m.model,
    }));
  }

  async health(): Promise<boolean> {
    try {
      await ollama.list();
      return true;
    } catch {
      return false;
    }
  }
}
```


=====================================================
FILE: services\ai\provider.ts
=====================================================

```ts
import { ChatCompletionRequest, AIModel } from "./types";

export interface AIProvider {
  chat(request: ChatCompletionRequest): Promise<string>;

  stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string>;

  listModels(): Promise<AIModel[]>;

  health(): Promise<boolean>;
}
```


=====================================================
FILE: services\ai\registry.ts
=====================================================

```ts
import { AIProvider } from "./provider";

class AIRegistry {
  private provider: AIProvider | null = null;

  register(provider: AIProvider) {
    this.provider = provider;
  }

  get(): AIProvider {
    if (!this.provider) {
      throw new Error("No AI provider registered.");
    }

    return this.provider;
  }
}

export const aiRegistry = new AIRegistry();
```


=====================================================
FILE: services\ai\types.ts
=====================================================

```ts
export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: AIMessage[];
}

export interface AIModel {
  name: string;
  size?: number;
}
```


=====================================================
FILE: services\chat\chat.service.ts
=====================================================

```ts
import { MessageRole } from "@/types/chat";

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export interface StreamOptions {
  model?: string;
  messages: AIMessage[];
  onToken: (token: string) => void;
}

export class ChatService {
  async streamMessage({
    model = "qwen3:4b",
    messages,
    onToken,
  }: StreamOptions): Promise<void> {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    if (!response.body) {
      throw new Error("Response body is empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        onToken(decoder.decode(value, { stream: true }));
      }

      // Flush remaining buffered bytes
      const remaining = decoder.decode();

      if (remaining) {
        onToken(remaining);
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const chatService = new ChatService();
```


=====================================================
FILE: services\chat\index.ts
=====================================================

```ts

```


=====================================================
FILE: services\models\model.service.ts
=====================================================

```ts
export interface LocalModel {
  id: string;
  name: string;
  size: number;
}

export class ModelService {
  async getModels(): Promise<LocalModel[]> {
    const response = await fetch("/api/models");

    if (!response.ok) {
      throw new Error("Failed to fetch models.");
    }

    const data = await response.json();

    return data.models;
  }
}

export const modelService = new ModelService();
```


=====================================================
FILE: store\chat.store.ts
=====================================================

```ts
import { create } from "zustand";
import { chatService } from "@/services/chat/chat.service";
import { ChatMessage } from "@/types/chat";
import { useModelStore } from "./model.store";
interface ChatStore {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  async sendMessage(content: string) {
    if (!content.trim()) return;

    // User message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    // Empty assistant message (will be streamed into)
    const assistantId = crypto.randomUUID();

    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    // Add both messages immediately
    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      loading: true,
      error: null,
    }));

    try {
      // Exclude the empty assistant placeholder from history
      const history = get()
        .messages
        .filter(
          (m) => !(m.id === assistantId && m.content === "")
        )
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      await chatService.streamMessage({
        model: useModelStore.getState().selectedModel,

        messages: [
          {
            role: "system",
            content: `You are AGENTS.

You are an AI Operating System.

You specialize in:
- Software Engineering
- AI Development
- Web Development
- Data Structures & Algorithms
- Resume Optimization
- Job Applications

Rules:
- Always answer in Markdown.
- Always use fenced code blocks when writing code.
- Be concise but complete.
- Explain code only when necessary.
- Prefer production-ready solutions.
- Think step by step before answering.`,
          },

          ...history,
        ],

        onToken: (token: string) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: message.content + token,
                  }
                : message
            ),
          }));
        },
      });

      set({
        loading: false,
      });
    } catch (error) {
      console.error(error);

      set((state) => ({
        loading: false,
        error: "Failed to generate response.",
        messages: state.messages.filter(
          (message) => message.id !== assistantId
        ),
      }));
    }
  },

  clearMessages() {
    set({
      messages: [],
      loading: false,
      error: null,
    });
  },
}));
```


=====================================================
FILE: store\model.store.ts
=====================================================

```ts
import { create } from "zustand";
import { modelService, LocalModel } from "@/services/models/model.service";

interface ModelStore {
  models: LocalModel[];
  selectedModel: string;

  loadModels: () => Promise<void>;

  setSelectedModel: (model: string) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],

  selectedModel: "qwen3:4b",

  async loadModels() {
    try {
      const models = await modelService.getModels();

      set({
        models,
      });
    } catch (error) {
      console.error(error);
    }
  },

  setSelectedModel(model) {
    localStorage.setItem(
      "selected-model",
      model
    );

    set({
      selectedModel: model,
    });
  },
}));
```


=====================================================
FILE: store\settings.store.ts
=====================================================

```ts

```


=====================================================
FILE: types\chat.ts
=====================================================

```ts
export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
```
