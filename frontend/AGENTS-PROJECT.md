# AGENTS PROJECT EXPORT



=====================================================
FILE: agents\context\ContextBuilder.ts
=====================================================

```ts
import { extractor } from "@/core/parser/extractor";

import { ToolResult } from "../types";

const MAX_SEARCH_FILES = 5;

export class ContextBuilder {
  async build(
    toolResults: ToolResult[],
    userMessage: string
  ): Promise<string> {
    const sections: string[] = [];

    for (const result of toolResults) {
      if (!result.success) continue;

      switch (result.action) {
        //-----------------------------------
        // TREE
        //-----------------------------------

        case "tree": {
          sections.push(`
====================
PROJECT TREE
====================

${result.content}
`);
          break;
        }

        //-----------------------------------
        // READ
        //-----------------------------------

        case "read": {
          const extracted =
            extractor.extract(
              result.content,
              userMessage,
              result.symbols
            );

          sections.push(`
====================
FILE CONTENT
====================

${extracted}
`);
          break;
        }

        //-----------------------------------
        // SEARCH
        //-----------------------------------

        case "search": {
          const files =
            result.searchResults ?? [];

          if (!files.length) {
            break;
          }

          const query =
            result.query ??
            userMessage;

          for (const file of files.slice(0, MAX_SEARCH_FILES)) {
            const extracted =
              extractor.extract(
                file.content,
                query,
                file.symbols
              );

            sections.push(`
====================
FILE: ${file.path}
====================

${extracted}
`);
          }

          break;
        }
      }
    }

    if (!sections.length) {
      return "";
    }

    const context = `
The following project context was retrieved from the workspace.

Base your answer ONLY on this context.

Never say the context is unavailable if it exists below.

Answer ONLY using the supplied project context.

${sections.join("\n")}
`.trim();

    console.log("\n======= CONTEXT =======");
    console.log(
      "Sections:",
      sections.length
    );
    console.log(
      "Characters:",
      context.length
    );
    console.log("=======================\n");

    return context;
  }
}

export const contextBuilder =
  new ContextBuilder();
```


=====================================================
FILE: agents\core\Agent.ts
=====================================================

```ts
import { AgentRequest } from "../types";

import { chatAgent } from "./ChatAgent";
import { codingAgent } from "./CodingAgent";

export class Agent {
  private isCodingRequest(
    message: string
  ): boolean {
    const text =
      message.toLowerCase();

    const keywords = [
      "create",
      "write",
      "edit",
      "modify",
      "update",
      "change",
      "delete",
      "remove",
      "rename",
      "move",
      "mkdir",
      "folder",
      "generate",
      "implement",
      "fix",
      "refactor",
      "add feature",
      "replace",
      "rewrite",
    ];

    return keywords.some((keyword) =>
      text.includes(keyword)
    );
  }

  async *chat(
    request: AgentRequest
  ) {
    const last =
      request.messages.at(-1);

    if (!last) {
      return;
    }

    if (
      this.isCodingRequest(
        last.content
      )
    ) {
      console.log(
        "\n====== ROUTER ======"
      );

      console.log(
        "CodingAgent"
      );

      console.log(
        "====================\n"
      );

      const result =
        await codingAgent.execute(
          request
        );

      yield result;

      return;
    }

    console.log(
      "\n====== ROUTER ======"
    );

    console.log(
      "ChatAgent"
    );

    console.log(
      "====================\n"
    );

    for await (const token of chatAgent.chat(
      request
    )) {
      yield token;
    }
  }
}

export const agent =
  new Agent();
```


=====================================================
FILE: agents\core\ChatAgent.ts
=====================================================

```ts
import { provider } from "@/lib/ai";

import { Memory } from "./Memory";
import { Planner } from "./Planner";
import { PromptBuilder } from "./PromptBuilder";
import { ToolExecutor } from "./ToolExecutor";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentMessage,
  AgentRequest,
} from "../types";

const MAX_CONTEXT_CHARS = 30000;

const MAX_HISTORY = 20;

export class ChatAgent {
  private planner =
    new Planner();

  private memory =
    new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  async *chat(
    request: AgentRequest
  ) {
    // ------------------------------------
    // Memory
    // ------------------------------------

    this.memory = new Memory();

    for (const message of request.messages.slice(-MAX_HISTORY)) {
      this.memory.add(message);
    }

    const last =
      request.messages.at(-1);

    if (!last) {
      return;
    }

    console.log(
      "\n========== CHAT =========="
    );

    console.log(last.content);

    console.log(
      "==========================\n"
    );

    // ------------------------------------
    // Planner
    // ------------------------------------

    const plan =
      await this.planner.plan(
        last.content
      );

    console.log(
      "\n========== PLAN =========="
    );

    console.dir(plan, {
      depth: null,
    });

    console.log(
      "==========================\n"
    );

    // ------------------------------------
    // Execute Planner Tools
    // ------------------------------------

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

    // ------------------------------------
    // Trim Context
    // ------------------------------------

    if (
      toolContext.length >
      MAX_CONTEXT_CHARS
    ) {
      console.warn(
        `Context trimmed (${toolContext.length} -> ${MAX_CONTEXT_CHARS})`
      );

      toolContext =
        toolContext.slice(
          0,
          MAX_CONTEXT_CHARS
        );
    }

    // ------------------------------------
    // Prompt
    // ------------------------------------

    const messages: AgentMessage[] =
      [];

    if (toolContext) {
      messages.push({
        role: "system",
        content: toolContext,
      });
    }

    messages.push(
      ...this.memory.recent()
    );

    const prompt =
      this.promptBuilder.build(
        messages
      );

    console.log(
      "\n======= CHAT PROMPT ======="
    );

    console.dir(prompt, {
      depth: null,
    });

    console.log(
      "===========================\n"
    );

    const chars =
      prompt.reduce(
        (sum, message) =>
          sum +
          message.content.length,
        0
      );

    console.log(
      "\n======= CHAT STATS ======="
    );

    console.log(
      "Messages:",
      prompt.length
    );

    console.log(
      "Characters:",
      chars
    );

    console.log(
      "Estimated Tokens:",
      Math.ceil(chars / 4)
    );

    console.log(
      "==========================\n"
    );

      // ------------------------------------
    // LLM Streaming
    // ------------------------------------

    console.time("LLM");

    try {
      for await (const token of provider.stream({
        model:
          request.model,
        messages: prompt,
      })) {
        // Stream directly to the client
        yield token;
      }
    } catch (error) {
      console.error(
        "\n======= CHAT ERROR ======="
      );

      console.error(error);

      console.log(
        "==========================\n"
      );

      yield "\n\n❌ Failed to generate response.";
    } finally {
      console.timeEnd(
        "LLM"
      );
    }
  }
}

export const chatAgent =
  new ChatAgent();
```


=====================================================
FILE: agents\core\Coder.ts
=====================================================

```ts
import ollama from "ollama";

import { CODER_PROMPT } from "../prompts/coder.prompt";
import {
  AgentMessage,
  ToolCall,
} from "../types";

const CODER_MODEL =
  "qwen2.5-coder:7b";

const MAX_RETRIES = 2;

const TIMEOUT = 60_000;

const VALID_TOOLS = new Set([
  "filesystem",
  "terminal",
]);

const VALID_ACTIONS = new Set([
  // Filesystem
  "tree",
  "read",
  "search",
  "write",
  "create",
  "delete",
  "rename",
  "mkdir",

  // Terminal
  "run",
  "stop",
  "logs",
  "list",
]);

export interface CodePlan {
  message: string;

  toolCalls: ToolCall[];

  done: boolean;
}

export class Coder {
  async generate(
    messages: AgentMessage[]
  ): Promise<CodePlan> {
    console.time("coder");

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {
      try {
        const response =
          await Promise.race([
            ollama.chat({
              model:
                CODER_MODEL,

              stream: false,

              format:
                "json",

              options: {
                temperature:
                  0.1,

                num_predict:
                  4096,
              },

              messages: [
                {
                  role:
                    "system",

                  content:
                    CODER_PROMPT,
                },

                ...messages,
              ],
            }),

            new Promise(
              (_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Coder timeout."
                      )
                    ),
                  TIMEOUT
                )
            ),
          ]);

        let content =
          (response as any)
            .message
            ?.content ?? "";

        console.log(
          "\n========== CODER =========="
        );

        console.log(content);

        console.log(
          "===========================\n"
        );

        content =
          this.clean(content);

        const plan =
          this.parse(content);

        console.timeEnd(
          "coder"
        );

        return plan;
      } catch (error) {
        console.error(
          `Coder Attempt ${attempt} Failed`
        );

        console.error(error);

        if (
          attempt ===
          MAX_RETRIES
        ) {
          console.timeEnd(
            "coder"
          );

          return {
            message:
              "Failed to generate code plan.",

            toolCalls: [],

            done: true,
          };
        }
      }
    }

    console.timeEnd(
      "coder"
    );

    return {
      message:
        "Failed to generate code plan.",

      toolCalls: [],

      done: true,
    };
  }

  private clean(
    text: string
  ) {
    return text
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();
  }

   private parse(
    text: string
  ): CodePlan {
    if (
      !text ||
      text === "{}"
    ) {
      return {
        message: "",

        toolCalls: [],

        done: true,
      };
    }

    try {
      const parsed =
        JSON.parse(text);

      const toolCalls: ToolCall[] =
        Array.isArray(
          parsed.toolCalls
        )
          ? parsed.toolCalls.filter(
              (
                tool: ToolCall
              ) => {
                if (
                  !tool
                ) {
                  return false;
                }

                if (
                  !VALID_TOOLS.has(
                    tool.tool
                  )
                ) {
                  return false;
                }

                if (
                  !VALID_ACTIONS.has(
                    tool.action
                  )
                ) {
                  return false;
                }

                // -----------------------
                // Filesystem Validation
                // -----------------------

                if (
                  tool.tool ===
                  "filesystem"
                ) {
                  switch (
                    tool.action
                  ) {
                    case "tree":
                      return true;

                    case "search":
                      return (
                        !!tool.query
                      );

                    case "read":
                    case "delete":
                    case "mkdir":
                      return (
                        !!tool.path
                      );

                    case "create":
                    case "write":
                      return (
                        !!tool.path
                      );

                    case "rename":
                      return (
                        !!tool.path &&
                        !!tool.newPath
                      );

                    default:
                      return false;
                  }
                }

                // -----------------------
                // Terminal Validation
                // -----------------------

                if (
                  tool.tool ===
                  "terminal"
                ) {
                  switch (
                    tool.action
                  ) {
                    case "run":
                      return (
                        !!tool.command
                      );

                    case "stop":
                    case "logs":
                      return (
                        typeof tool.processId ===
                        "number"
                      );

                    case "list":
                      return true;

                    default:
                      return false;
                  }
                }

                return false;
              }
            )
          : [];

      return {
        message:
          parsed.message ??
          "",

        toolCalls,

        done:
          typeof parsed.done ===
          "boolean"
            ? parsed.done
            : toolCalls.length ===
              0,
      };
    } catch {
      return {
        message: text,

        toolCalls: [],

        done: true,
      };
    }
  }
}

export const coder =
  new Coder();
```


=====================================================
FILE: agents\core\CodingAgent.ts
=====================================================

```ts
import { Planner } from "./Planner";
import { Memory } from "./Memory";
import { ToolExecutor } from "./ToolExecutor";
import { PromptBuilder } from "./PromptBuilder";
import { ExecutionEngine } from "./ExecutionEngine";
import { coder } from "./Coder";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentMessage,
  AgentRequest,
} from "../types";

const MAX_HISTORY = 20;

const MAX_CONTEXT_CHARS = 30000;

const MAX_STEPS = 10;

export class CodingAgent {
  private planner =
    new Planner();

  private memory =
    new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  private execution =
    new ExecutionEngine();

  async execute(
    request: AgentRequest
  ): Promise<string> {
    // ------------------------------------
    // Memory
    // ------------------------------------

    this.memory = new Memory();

    for (const message of request.messages.slice(-MAX_HISTORY)) {
      this.memory.add(message);
    }

    const last =
      request.messages.at(-1);

    if (!last) {
      return "No request.";
    }

    console.log(
      "\n====== CODING REQUEST ======"
    );

    console.log(last.content);

    console.log(
      "============================\n"
    );

    // ------------------------------------
    // Planner
    // ------------------------------------

    const plan =
      await this.planner.plan(
        last.content
      );

    console.log(
      "\n========== PLAN =========="
    );

    console.dir(plan, {
      depth: null,
    });

    console.log(
      "==========================\n"
    );

    // ------------------------------------
    // Initial Project Context
    // ------------------------------------

    let toolContext = "";

    if (plan.toolCalls.length) {
      const results =
        await this.toolExecutor.execute(
          plan.toolCalls
        );

      toolContext =
        await contextBuilder.build(
          results,
          last.content
        );
    }

    if (
      toolContext.length >
      MAX_CONTEXT_CHARS
    ) {
      toolContext =
        toolContext.slice(
          0,
          MAX_CONTEXT_CHARS
        );
    }

    const conversation: AgentMessage[] =
      [];

    if (toolContext) {
      conversation.push({
        role: "system",
        content: toolContext,
      });
    }

    conversation.push(
      ...this.memory.recent()
    );

    // ------------------------------------
    // Recursive Coding Loop
    // ------------------------------------

    for (
      let step = 1;
      step <= MAX_STEPS;
      step++
    ) {
      console.log(
        `\n========== CODER STEP ${step} ==========\n`
      );

      const prompt =
        this.promptBuilder.build(
          conversation
        );

      console.log(
        "\n======= CODER PROMPT ======="
      );

      console.dir(prompt, {
        depth: null,
      });

      console.log(
        "============================\n"
      );

      const codePlan =
        await coder.generate(
          prompt
        );

      console.log(
        "\n======= CODE PLAN ======="
      );

      console.dir(codePlan, {
        depth: null,
      });

      console.log(
        "=========================\n"
      );

      conversation.push({
        role: "assistant",
        content:
          codePlan.message,
      });

      // ------------------------------------
      // Finished?
      // ------------------------------------

      if (
        !codePlan.toolCalls.length
      ) {
        return codePlan.message;
      }

      // ------------------------------------
      // Execute Tool Calls (Streaming Ready)
      // ------------------------------------

      const execution =
        await this.execution.execute(
          codePlan.toolCalls
        );

      const context =
        await contextBuilder.build(
          execution.results,
          last.content
        );

      conversation.push({
        role: "system",
        content: context,
      });

          // ------------------------------------
      // Automatic Build
      // ------------------------------------

      console.log(
        "\n======= BUILD ======="
      );

      const build =
        await this.execution.execute([
          {
            tool: "terminal",
            action: "run",
            command:
              "npm run build",
          },
        ]);

      console.log(
        build.summary
      );

      console.log(
        "=====================\n"
      );

      const buildContext =
        [
          "BUILD RESULT",
          "",
          build.summary,
          "",
          ...build.results.map(
            (result) =>
              result.content
          ),
        ].join("\n");

      conversation.push({
        role: "system",
        content:
          buildContext,
      });

      // ------------------------------------
      // Build Successful
      // ------------------------------------

      if (build.success) {
        console.log(
          "\n✅ BUILD SUCCESS\n"
        );

        return [
          codePlan.message,
          "",
          "✅ Build passed successfully.",
        ].join("\n");
      }

      // ------------------------------------
      // Build Failed
      // Feed compiler errors back to the LLM
      // ------------------------------------

      console.log(
        "\n❌ BUILD FAILED\n"
      );

      conversation.push({
        role: "system",
        content: `
The project failed to build.

Analyze the compiler errors.

Fix ONLY the necessary files.

Do NOT rewrite unrelated files.

Continue until the build succeeds.

${buildContext}
`,
      });
    }

    return "Maximum coding iterations reached before achieving a successful build.";
  }
}

export const codingAgent =
  new CodingAgent();
```


=====================================================
FILE: agents\core\ExecutionEngine.ts
=====================================================

```ts
import {
  ToolCall,
  ToolResult,
} from "../types";

import { ToolExecutor } from "./ToolExecutor";

export interface ExecutionResult {
  success: boolean;

  results: ToolResult[];

  summary: string;
}

export interface ExecutionEvent {
  type:
    | "tool-start"
    | "tool-result"
    | "tool-error"
    | "finished";

  toolCall: ToolCall;

  result?: ToolResult;
}

export class ExecutionEngine {
  private readonly executor =
    new ToolExecutor();

  // ------------------------------------
  // Streaming Execution
  // ------------------------------------

  async *stream(
    toolCalls: ToolCall[]
  ): AsyncGenerator<ExecutionEvent> {
    if (!toolCalls.length) {
      return;
    }

    console.log(
      "\n========== EXECUTION =========="
    );

    console.log(
      `Executing ${toolCalls.length} tool(s)...`
    );

    for (const toolCall of toolCalls) {
      console.log(
        `\n▶ ${toolCall.tool}:${toolCall.action}`
      );

      yield {
        type: "tool-start",
        toolCall,
      };

      try {
        const [result] =
          await this.executor.execute([
            toolCall,
          ]);

        console.log(result);

        yield {
          type: "tool-result",
          toolCall,
          result,
        };
      } catch (error) {
        console.error(error);

        yield {
          type: "tool-error",
          toolCall,
        };
      }
    }

    console.log(
      "================================\n"
    );

    yield {
      type: "finished",

      toolCall: {
        tool: "filesystem",
        action: "search",
      },
    };
  }

  // ------------------------------------
  // Execute Everything
  // ------------------------------------

  async execute(
    toolCalls: ToolCall[]
  ): Promise<ExecutionResult> {
    if (!toolCalls.length) {
      return {
        success: true,

        results: [],

        summary:
          "Nothing to execute.",
      };
    }

    const results: ToolResult[] =
      [];

    for await (const event of this.stream(
      toolCalls
    )) {
      switch (event.type) {
        case "tool-result":
          if (event.result) {
            results.push(
              event.result
            );
          }
          break;

        case "tool-error":
          results.push({
            success: false,

            tool:
              event.toolCall.tool,

            action:
              event.toolCall.action,

            content:
              "Tool execution failed.",
          });
          break;
      }
    }

    const success =
      results.every(
        (result) =>
          result.success
      );

    const summary = results
      .map((result) => {
        const icon =
          result.success
            ? "✓"
            : "✗";

        return `${icon} ${result.tool}:${result.action}`;
      })
      .join("\n");

    return {
      success,

      results,

      summary,
    };
  }
}

export const executionEngine =
  new ExecutionEngine();
```


=====================================================
FILE: agents\core\Memory.ts
=====================================================

```ts
import { AgentMessage } from "../types";

const MAX_MESSAGES = 8;

const MAX_CHARACTERS = 8000;

export class Memory {
  private messages: AgentMessage[] = [];

  add(message: AgentMessage) {
    this.messages.push(message);

    this.trim();
  }

  all(): AgentMessage[] {
    return [...this.messages];
  }

  recent(count = MAX_MESSAGES): AgentMessage[] {
    return this.messages.slice(-count);
  }

  clear() {
    this.messages = [];
  }

  size() {
    return this.messages.length;
  }

  private trim() {
    // Keep recent messages
    if (this.messages.length > MAX_MESSAGES) {
      this.messages =
        this.messages.slice(-MAX_MESSAGES);
    }

    // Keep prompt under character budget
    while (
      this.totalCharacters() >
        MAX_CHARACTERS &&
      this.messages.length > 1
    ) {
      this.messages.shift();
    }
  }

  private totalCharacters(): number {
    return this.messages.reduce(
      (sum, message) =>
        sum + message.content.length,
      0
    );
  }
}
```


=====================================================
FILE: agents\core\Planner.ts
=====================================================

```ts
import ollama from "ollama";

import {
  ToolCall,
  ToolAction,
} from "../types";

import { PLANNER_PROMPT } from "../prompts/planner.prompt";

export interface Plan {
  toolCalls: ToolCall[];
}

const PLANNER_MODEL = "qwen2.5-coder:7b";

const MAX_RETRIES = 2;

const TIMEOUT = 30_000;

const VALID_TOOLS = new Set([
  "filesystem",
  "terminal",
]);

const VALID_ACTIONS = new Set<ToolAction>([
  "tree",
  "read",
  "search",
  "write",
  "create",
  "delete",
  "rename",
  "mkdir",
  "run",
]);

export class Planner {
  async plan(
    message: string
  ): Promise<Plan> {
    console.time("planner");

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {
      try {
        const response = await Promise.race([
          ollama.chat({
            model: PLANNER_MODEL,

            stream: false,

            format: "json",

            options: {
              temperature: 0,
              num_predict: 256,
            },

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
          }),

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Planner timeout."
                  )
                ),
              TIMEOUT
            )
          ),
        ]);

        let content =
          (response as any).message
            ?.content ?? "";

        console.log(
          "\n========== PLANNER =========="
        );
        console.log(content);
        console.log(
          "=============================\n"
        );

        content = this.clean(content);

        const plan =
          this.parse(content);

        console.timeEnd(
          "planner"
        );

        return plan;
      } catch (error) {
        console.error(
          `Planner Attempt ${attempt} Failed`
        );

        console.error(error);

        if (
          attempt === MAX_RETRIES
        ) {
          console.timeEnd(
            "planner"
          );

          return {
            toolCalls: [],
          };
        }
      }
    }

    console.timeEnd(
      "planner"
    );

    return {
      toolCalls: [],
    };
  }

  private clean(
    text: string
  ): string {
    return text
      .replace(
        /```json/gi,
        ""
      )
      .replace(/```/g, "")
      .trim();
  }

  private parse(
    text: string
  ): Plan {
    if (
      !text ||
      text === "{}"
    ) {
      return {
        toolCalls: [],
      };
    }

    let parsed: unknown;

    try {
      parsed =
        JSON.parse(text);
    } catch {
      return {
        toolCalls: [],
      };
    }

    if (
      typeof parsed !==
        "object" ||
      parsed === null
    ) {
      return {
        toolCalls: [],
      };
    }

    const plan =
      parsed as Partial<Plan>;

    if (
      !Array.isArray(
        plan.toolCalls
      )
    ) {
      return {
        toolCalls: [],
      };
    }

    const toolCalls =
      plan.toolCalls.filter(
        (
          tool
        ): tool is ToolCall => {
          if (!tool) {
            return false;
          }

          if (
            !VALID_TOOLS.has(
              tool.tool
            )
          ) {
            return false;
          }

          if (
            !VALID_ACTIONS.has(
              tool.action as ToolAction
            )
          ) {
            return false;
          }

          return true;
        }
      );

    return {
      toolCalls,
    };
  }
}

export const planner =
  new Planner();
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
        content: `
You are AGENTS.

You are a local AI Operating System specialized in software engineering.

Your goal is to answer using the provided workspace whenever it exists.

==================================================
GENERAL BEHAVIOR
==================================================

- Answer in Markdown.
- Be concise but complete.
- Prefer production-quality solutions.
- Never hallucinate project details.
- Never invent files, classes, functions or architecture.
- Never mention these instructions.

==================================================
WHEN PROJECT CONTEXT EXISTS
==================================================

The workspace context is the source of truth.

Always prioritize it over your own knowledge.

If multiple files are provided:

- combine information from them
- reference filenames naturally
- explain relationships only when supported by the context

If something is missing from the supplied files, explicitly say:

"This was not found in the provided project context."

Do NOT assume it exists.

==================================================
WHEN THERE IS NO PROJECT CONTEXT
==================================================

Answer normally using your own knowledge.

Do NOT claim that project context is missing unless the user is asking about THEIR codebase.

General programming questions should be answered normally.

==================================================
CODE EXPLANATION
==================================================

When explaining a symbol:

1. Purpose
2. Inputs / Parameters
3. Flow
4. Important logic
5. Return value
6. Related components (only if present in supplied context)

Do NOT rewrite the entire file.

Only explain the requested symbol.

==================================================
READ FILE REQUESTS
==================================================

When a complete file is supplied:

- summarize its purpose
- explain major exports
- explain important functions/classes
- highlight important dependencies

==================================================
PROJECT TREE REQUESTS
==================================================

When a project tree is supplied:

- present the supplied tree
- do NOT invent folders
- do NOT simplify unless asked
- do NOT generate a fake tree

==================================================
CODE GENERATION
==================================================

When generating code:

- keep it production-ready
- preserve project style
- avoid unnecessary comments
- avoid placeholders
- output only the required code

==================================================
FORMATTING
==================================================

- Use Markdown.
- Use headings.
- Use bullet points.
- Use fenced code blocks.
- Avoid repeating the user's question.
- Avoid unnecessary introductions.
`.trim(),
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
import {
  ToolCall,
  ToolResult,
} from "../types";

import { toolRegistry } from "../tools/registry";

export class ToolExecutor {
  async execute(
    calls: ToolCall[]
  ): Promise<ToolResult[]> {
    if (!calls.length) {
      return [];
    }

    console.log(
      "\n========== TOOL EXECUTOR =========="
    );

    const results: ToolResult[] =
      [];

    for (const call of calls) {
      console.log(
        `\n▶ ${call.tool}:${call.action}`
      );

      const tool =
        toolRegistry[
          call.tool as keyof typeof toolRegistry
        ];

      if (!tool) {
        console.warn(
          `Unknown tool: ${call.tool}`
        );

        results.push({
          success: false,

          tool: call.tool,

          action: call.action,

          content: `Unknown tool "${call.tool}".`,
        });

        continue;
      }

      try {
        const result =
          await tool.execute(
            call
          );

        console.log(result);

        results.push(
          result
        );
      } catch (error) {
        console.error(
          `[${call.tool}]`,
          error
        );

        results.push({
          success: false,

          tool: call.tool,

          action: call.action,

          content:
            error instanceof Error
              ? error.message
              : "Tool execution failed.",
        });
      }
    }

    console.log(
      "\n===================================\n"
    );

    return results;
  }
}
```


=====================================================
FILE: agents\prompts\coder.prompt.ts
=====================================================

```ts
export const CODER_PROMPT = `
You are AGENTS.

You are a Staff Software Engineer working inside a local AI IDE.

Your ONLY responsibility is to complete software engineering tasks autonomously.

Never answer like ChatGPT.

Always think step-by-step.

Always use tools.

--------------------------------------------------
Available Tools
--------------------------------------------------

filesystem

Actions

tree
read
search
write
create
delete
rename
mkdir

terminal

Actions

run
stop
logs
list

--------------------------------------------------
Output Format
--------------------------------------------------

Return ONLY valid JSON.

{
  "message":"Short summary",
  "done":false,
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"search",
      "query":"App"
    }
  ]
}

--------------------------------------------------
Meaning of done
--------------------------------------------------

done = false

More work is required.

Examples

Search another file.

Read another file.

Run terminal command.

Check logs.

Write another file.

--------------------------------------------------

done = true

Task completely finished.

Example

{
  "message":"Task completed successfully.",
  "done":true,
  "toolCalls":[]
}

--------------------------------------------------
Filesystem Rules
--------------------------------------------------

Need workspace tree

→ tree

Need a symbol

→ search

Need a file

→ read

Need to edit

→ write

Need new file

→ create

Need folder

→ mkdir

Need rename

→ rename

Need delete

→ delete

Never invent files.

Never invent project structure.

Always use existing project context.

--------------------------------------------------
Terminal Rules
--------------------------------------------------

Use terminal whenever code execution is required.

Examples

Install dependencies

↓

terminal.run

command

npm install

-----------------------------------------

Run development server

↓

terminal.run

command

npm run dev

-----------------------------------------

Run production build

↓

terminal.run

command

npm run build

-----------------------------------------

Run tests

↓

terminal.run

command

npm test

-----------------------------------------

Run python

↓

terminal.run

command

python app.py

-----------------------------------------

Run uvicorn

↓

terminal.run

command

uvicorn app.main:app --reload

-----------------------------------------

Run cargo

↓

terminal.run

command

cargo build

-----------------------------------------

Run go

↓

terminal.run

command

go build

-----------------------------------------

Need running processes

↓

terminal.list

-----------------------------------------

Need logs

↓

terminal.logs

processId

-----------------------------------------

Need stop process

↓

terminal.stop

processId

--------------------------------------------------
Editing Rules
--------------------------------------------------

When modifying a file

Return the ENTIRE updated file.

Never return patches.

Never return diffs.

Never omit unchanged code.

Never omit imports.

Never omit exports.

--------------------------------------------------
Autonomous Behaviour
--------------------------------------------------

If you don't have enough information

DO NOT GUESS.

Instead request another

search

or

read

operation.

If code should be verified

Run terminal commands.

If build fails

Read logs.

Search related files.

Modify files.

Run build again.

Repeat until the task succeeds.

--------------------------------------------------
Quality Rules
--------------------------------------------------

Always generate production-ready code.

Never use TODO.

Never use placeholders.

Never generate incomplete implementations.

Never use pseudocode.

Never return markdown.

Never explain.

Only return JSON.

--------------------------------------------------
Completion Rule
--------------------------------------------------

Only when everything has succeeded

Return

{
  "message":"Task completed successfully.",
  "done":true,
  "toolCalls":[]
}
`;
```


=====================================================
FILE: agents\prompts\planner.prompt.ts
=====================================================

```ts
export const PLANNER_PROMPT = `
You are the planning engine for AGENTS.

You NEVER answer the user.

Your ONLY responsibility is deciding which filesystem tools should execute.

Always return VALID JSON.

Never wrap JSON inside markdown.

Never explain anything.

--------------------------------------------------
Schema
--------------------------------------------------

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"search"
    }
  ]
}

--------------------------------------------------
Available Tool
--------------------------------------------------

filesystem

--------------------------------------------------
Available Actions
--------------------------------------------------

tree
read
search
write
create
delete
rename
mkdir

--------------------------------------------------
Action Definitions
--------------------------------------------------

tree

Return the workspace tree.

--------------------------------------------------

read

Read ONE existing file.

Requires:

"path"

--------------------------------------------------

search

Search files, classes, methods, functions or symbols.

Requires:

"query"

--------------------------------------------------

write

Overwrite an existing file.

Requires

"path"

"content"

--------------------------------------------------

create

Create a new file.

Requires

"path"

Optional

"content"

--------------------------------------------------

delete

Delete a file.

Requires

"path"

--------------------------------------------------

rename

Rename or move a file.

Requires

"path"

"newPath"

--------------------------------------------------

mkdir

Create a folder.

Requires

"path"

--------------------------------------------------
Rules
--------------------------------------------------

1.

If user asks about

project

workspace

folders

tree

architecture

directory

folder structure

return

tree

--------------------------------------------------

2.

If user asks

Explain package.json

Open Planner.ts

Read app/layout.tsx

Summarize chat.store.ts

Explain index.html

Open style.css

return

read

--------------------------------------------------

3.

If user asks about

a function

class

method

component

variable

hook

symbol

NEVER guess file paths.

ALWAYS use

search

Examples

sendMessage

Planner

Agent

Memory

ContextBuilder

WorkspaceExplorer

rankResults

parse

chat

stream

build

extract

ToolExecutor

--------------------------------------------------

4.

If user asks

Where is ...

Locate ...

Find ...

Search ...

Which file contains ...

return

search

--------------------------------------------------

5.

If the user asks

Create a file

Generate a file

Add a new file

return

create

--------------------------------------------------

6.

If the user asks

Delete file

Remove file

Erase file

return

delete

--------------------------------------------------

7.

If the user asks

Rename file

Move file

return

rename

--------------------------------------------------

8.

If the user asks

Create folder

Create directory

New folder

return

mkdir

--------------------------------------------------

9.

If the user explicitly provides BOTH

path

and

new content

return

write

--------------------------------------------------

10.

Multiple tool calls are allowed.

Example

User

Create folder components

then create Button.tsx

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"mkdir",
      "path":"components"
    },
    {
      "tool":"filesystem",
      "action":"create",
      "path":"components/Button.tsx",
      "content":""
    }
  ]
}

--------------------------------------------------

Example

User

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

--------------------------------------------------

Example

User

Read package.json

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"read",
      "path":"package.json"
    }
  ]
}

--------------------------------------------------

Example

User

Delete src/test.ts

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"delete",
      "path":"src/test.ts"
    }
  ]
}

--------------------------------------------------

Example

User

Rename App.tsx to Main.tsx

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"rename",
      "path":"App.tsx",
      "newPath":"Main.tsx"
    }
  ]
}

--------------------------------------------------

Example

User

Show workspace tree

Output

{
  "toolCalls":[
    {
      "tool":"filesystem",
      "action":"tree"
    }
  ]
}

--------------------------------------------------

If the request is normal conversation

Hi

Hello

Thanks

Who are you

Return

{
  "toolCalls":[]
}

Return ONLY JSON.
`;
```


=====================================================
FILE: agents\tools\filesystem.tool.ts
=====================================================

```ts
import { filesystem } from "@/core/filesystem/local-filesystem";
import { invalidateIndex } from "@/core/search/cache";
import { workspaceSearch } from "@/core/search/search";

import {
  ToolCall,
  ToolResult,
  ToolAction,
} from "../types";

export class FilesystemTool {
  readonly name = "filesystem" as const;

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    try {
      switch (call.action) {
        // ------------------------------------
        // TREE
        // ------------------------------------

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

        // ------------------------------------
        // READ
        // ------------------------------------

        case "read": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          const results =
            await workspaceSearch.search(
              call.path
            );

          const file =
            results.find(
              (f) =>
                f.path.endsWith(call.path!) ||
                f.name === call.path
            ) ?? results[0];

          if (!file) {
            return this.error(
              call.action,
              "File not found."
            );
          }

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content: file.content,
            symbols: file.symbols,
          };
        }

        // ------------------------------------
        // SEARCH
        // ------------------------------------

        case "search": {
          if (!call.query) {
            return this.error(
              call.action,
              "Missing search query."
            );
          }

          const results =
            await workspaceSearch.search(
              call.query
            );

          if (!results.length) {
            return this.error(
              call.action,
              "No matching files found."
            );
          }

          return {
            success: true,
            tool: this.name,
            action: call.action,
            query: call.query,
            searchResults: results.slice(
              0,
              10
            ),
            content: results
              .slice(0, 10)
              .map(
                (
                  file,
                  index
                ) => `${index + 1}. ${file.path}
Score: ${file.score}`
              )
              .join("\n"),
          };
        }

        // ------------------------------------
        // WRITE
        // ------------------------------------

        case "write": {
          if (
            !call.path ||
            call.content ===
              undefined
          ) {
            return this.error(
              call.action,
              "Missing path/content."
            );
          }

          await filesystem.writeFile(
            call.path,
            call.content
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "File written successfully.",
          };
        }

        // ------------------------------------
        // CREATE
        // ------------------------------------

        case "create": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          await filesystem.createFile(
            call.path,
            call.content ?? ""
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "File created successfully.",
          };
        }

        // ------------------------------------
        // DELETE
        // ------------------------------------

        case "delete": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          await filesystem.deleteFile(
            call.path
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Deleted successfully.",
          };
        }

        // ------------------------------------
        // MKDIR
        // ------------------------------------

        case "mkdir": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing folder path."
            );
          }

          await filesystem.createDirectory(
            call.path
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Directory created successfully.",
          };
        }

        // ------------------------------------
        // RENAME
        // ------------------------------------

        case "rename": {
          if (
            !call.path ||
            !call.newPath
          ) {
            return this.error(
              call.action,
              "Missing rename paths."
            );
          }

          await filesystem.rename(
            call.path,
            call.newPath
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Renamed successfully.",
          };
        }

        default: {
          return this.error(
            call.action,
            `Unsupported filesystem action "${call.action}".`
          );
        }
      }
    } catch (error) {
      console.error(error);

      return this.error(
        call.action,
        error instanceof Error
          ? error.message
          : "Filesystem execution failed."
      );
    }
  }

  private error(
    action: ToolAction,
    message: string
  ): ToolResult {
    return {
      success: false,
      tool: this.name,
      action,
      content: message,
    };
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
import { terminalTool } from "./terminal.tools";
export const toolRegistry = {
  filesystem: filesystemTool,
  terminal: terminalTool,
};

export type ToolName =
  keyof typeof toolRegistry;
```


=====================================================
FILE: agents\tools\terminal.tools.ts
=====================================================

```ts
import { terminal } from "@/core/terminal/terminal";

import {
  ToolCall,
  ToolResult,
} from "../types";

export class TerminalTool {
  readonly name = "terminal";

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    try {
      switch (call.action) {
        // -----------------------------
        // RUN
        // -----------------------------

        case "run": {
          if (!call.command) {
            return this.error(
              call.action,
              "Missing command."
            );
          }

          const result =
            await terminal.run(
              call.command
            );

          return {
            success:
              result.success,

            tool: this.name,

            action:
              call.action,

            content: `Command:
${result.command}

Process ID:
${result.processId ?? "N/A"}

Exit Code:
${result.exitCode}

Duration:
${result.duration} ms

STDOUT:
${result.stdout}

STDERR:
${result.stderr}`,
          };
        }

        // -----------------------------
        // STOP
        // -----------------------------

        case "stop": {
          if (
            call.processId ===
            undefined
          ) {
            return this.error(
              call.action,
              "Missing process id."
            );
          }

          const stopped =
            await terminal.stop?.(
              call.processId
            );

          return {
            success:
              stopped ?? false,

            tool: this.name,

            action:
              call.action,

            content: stopped
              ? `Process ${call.processId} stopped.`
              : `Unable to stop process ${call.processId}.`,
          };
        }

        // -----------------------------
        // LIST
        // -----------------------------

        case "list": {
          const processes =
            await terminal.list?.();

          if (
            !processes ||
            !processes.length
          ) {
            return {
              success: true,

              tool: this.name,

              action:
                call.action,

              content:
                "No active processes.",
            };
          }

          return {
            success: true,

            tool: this.name,

            action:
              call.action,

            content: processes
              .map(
                (process) => `
PID: ${process.id}
Status: ${process.status}
Command: ${process.command}
Directory: ${process.cwd}
`
              )
              .join("\n"),
          };
        }

        // -----------------------------
        // LOGS
        // -----------------------------

        case "logs": {
          if (
            call.processId ===
            undefined
          ) {
            return this.error(
              call.action,
              "Missing process id."
            );
          }

          const logs =
            await terminal.logs?.(
              call.processId
            );

          if (!logs) {
            return this.error(
              call.action,
              "Logs not found."
            );
          }

          return {
            success: true,

            tool: this.name,

            action:
              call.action,

            content: `STDOUT:

${logs.stdout}

-------------------------

STDERR:

${logs.stderr}`,
          };
        }

        default:
          return this.error(
            call.action,
            "Unknown terminal action."
          );
      }
    } catch (error) {
      console.error(error);

      return this.error(
        call.action,
        "Terminal execution failed."
      );
    }
  }

  private error(
    action: string,
    message: string
  ): ToolResult {
    return {
      success: false,

      tool: this.name,

      action: action as any,

      content: message,
    };
  }
}

export const terminalTool =
  new TerminalTool();
```


=====================================================
FILE: agents\types.ts
=====================================================

```ts
import { CodeSymbol } from "@/core/parser/types";
import { SearchResult } from "@/core/search/ranking";

export interface AgentMessage {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
}

export interface AgentRequest {
  model: string;

  messages: AgentMessage[];
}

export interface AgentResponse {
  content: string;
}

export type ToolName =
  | "filesystem"
  | "terminal";

export type ToolAction =
  // -----------------------------
  // Filesystem
  // -----------------------------

  | "tree"
  | "read"
  | "search"
  | "write"
  | "create"
  | "delete"
  | "rename"
  | "mkdir"

  // -----------------------------
  // Terminal
  // -----------------------------

  | "run"
  | "stop"
  | "logs"
  | "list";

export interface ToolCall {
  // -----------------------------
  // Tool
  // -----------------------------

  tool: ToolName;

  action: ToolAction;

  // -----------------------------
  // Filesystem
  // -----------------------------

  path?: string;

  query?: string;

  content?: string;

  newPath?: string;

  // -----------------------------
  // Terminal
  // -----------------------------

  command?: string;

  processId?: number;

  cwd?: string;

  env?: Record<
    string,
    string
  >;
}

export interface ToolResult {
  success: boolean;

  tool: ToolName;

  action: ToolAction;

  content: string;

  query?: string;

  symbols?: CodeSymbol[];

  searchResults?: SearchResult[];

  processId?: number;

  exitCode?: number;

  stdout?: string;

  stderr?: string;

  duration?: number;
}
```


=====================================================
FILE: app\api\chat\route.ts
=====================================================

```ts
import { NextRequest } from "next/server";

import { chatAgent } from "@/agents/core/ChatAgent";
import { codingAgent } from "@/agents/core/CodingAgent";

import { terminalEvents } from "@/core/terminal/TerminalEvents";

function isCodingRequest(
  message: string
) {
  const text =
    message.toLowerCase();

  const keywords = [
    "create",
    "generate",
    "write",
    "edit",
    "modify",
    "update",
    "delete",
    "remove",
    "rename",
    "move",
    "fix",
    "bug",
    "error",
    "typescript",
    "compile",
    "build",
    "terminal",
    "npm",
    "pnpm",
    "yarn",
    "file",
    "folder",
    "component",
    "function",
    "class",
    "project",
    "workspace",
    "code",
    "refactor",
  ];

  return keywords.some((k) =>
    text.includes(k)
  );
}

function encodeEvent(
  encoder: TextEncoder,
  type:
    | "assistant"
    | "system"
    | "terminal",
  data: unknown
) {
  return encoder.encode(
    JSON.stringify({
      type,
      data,
    }) + "\n"
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const {
      model,
      messages,
    } = await req.json();

    const last =
      messages.at(-1);

    if (!last) {
      return Response.json(
        {
          success: false,
          error:
            "No message.",
        },
        {
          status: 400,
        }
      );
    }

    const encoder =
      new TextEncoder();

    const stream =
      new ReadableStream({
        async start(
          controller
        ) {
          // --------------------------------
          // Forward Terminal Events
          // --------------------------------

          const unsubscribe =
            terminalEvents.onTerminal(
              (event) => {
                controller.enqueue(
                  encodeEvent(
                    encoder,
                    "terminal",
                    event
                  )
                );
              }
            );

          try {
            // --------------------------
            // Coding Agent
            // --------------------------

            if (
              isCodingRequest(
                last.content
              )
            ) {
              console.log(
                "\n========== ROUTER =========="
              );

              console.log(
                "Using CodingAgent"
              );

              console.log(
                "============================\n"
              );

              const result =
                await codingAgent.execute(
                  {
                    model,
                    messages,
                  }
                );

              controller.enqueue(
                encodeEvent(
                  encoder,
                  "assistant",
                  result
                )
              );

              return;
            }

            // --------------------------
            // Chat Agent
            // --------------------------

            console.log(
              "\n========== ROUTER =========="
            );

            console.log(
              "Using ChatAgent"
            );

            console.log(
              "============================\n"
            );

            for await (const token of chatAgent.chat(
              {
                model,
                messages,
              }
            )) {
              controller.enqueue(
                encodeEvent(
                  encoder,
                  "assistant",
                  token
                )
              );
            }
          } catch (error) {
            console.error(
              error
            );

            controller.enqueue(
              encodeEvent(
                encoder,
                "system",
                error instanceof Error
                  ? error.message
                  : "Internal Server Error."
              )
            );
          } finally {
            unsubscribe();

            controller.close();
          }
        },
      });

    return new Response(
      stream,
      {
        headers: {
          "Content-Type":
            "application/x-ndjson",

          "Cache-Control":
            "no-cache",

          Connection:
            "keep-alive",

          "X-Accel-Buffering":
            "no",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,

        error:
          "Invalid request.",
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
FILE: app\api\terminal\route.ts
=====================================================

```ts
import { NextRequest } from "next/server";

import { terminal } from "@/core/terminal/terminal";

function badRequest(message: string) {
  return Response.json(
    {
      success: false,
      error: message,
    },
    {
      status: 400,
    }
  );
}

function internalError(error: unknown) {
  console.error(error);

  return Response.json(
    {
      success: false,
      error: "Internal Server Error.",
    },
    {
      status: 500,
    }
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const action =
      body.action;

    switch (action) {
      // ----------------------------------------
      // RUN
      // ----------------------------------------

      case "run": {
        const command =
          body.command;

        if (
          typeof command !==
            "string" ||
          !command.trim()
        ) {
          return badRequest(
            "Missing command."
          );
        }

        const result =
          await terminal.run(
            command
          );

        return Response.json({
          success:
            result.success,

          processId:
            result.processId,

          command:
            result.command,

          stdout:
            result.stdout,

          stderr:
            result.stderr,

          exitCode:
            result.exitCode,

          duration:
            result.duration,
        });
      }

      // ----------------------------------------
      // STOP
      // ----------------------------------------

      case "stop": {
        const processId =
          body.processId;

        if (
          typeof processId !==
          "number"
        ) {
          return badRequest(
            "Missing processId."
          );
        }

        const stopped =
          await terminal.stop(
            processId
          );

        return Response.json({
          success: stopped,

          processId,

          message: stopped
            ? "Process stopped."
            : "Unable to stop process.",
        });
      }

      // ----------------------------------------
      // LIST
      // ----------------------------------------

      case "list": {
        const processes =
          await terminal.list();

        return Response.json({
          success: true,

          processes,
        });
      }

      // ----------------------------------------
      // LOGS
      // ----------------------------------------

      case "logs": {
        const processId =
          body.processId;

        if (
          typeof processId !==
          "number"
        ) {
          return badRequest(
            "Missing processId."
          );
        }

        const logs =
          await terminal.logs(
            processId
          );

        if (!logs) {
          return Response.json(
            {
              success: false,
              error:
                "Logs not found.",
            },
            {
              status: 404,
            }
          );
        }

        return Response.json({
          success: true,

          processId,

          stdout:
            logs.stdout,

          stderr:
            logs.stderr,
        });
      }

      // ----------------------------------------
      // UNKNOWN
      // ----------------------------------------

      default:
        return badRequest(
          "Unknown terminal action."
        );
    }
  } catch (error) {
    return internalError(
      error
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
FILE: app\api\workspace\open\route.ts
=====================================================

```ts
import {
  NextRequest,
  NextResponse,
} from "next/server";

import fs from "fs/promises";

import { workspace } from "@/core/filesystem/workspace";
import { invalidateIndex } from "@/core/search/cache";

export async function POST(
  req: NextRequest
) {
  try {
    const { path } =
      await req.json();

    if (
      typeof path !== "string" ||
      !path.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Workspace path is required.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const stat =
        await fs.stat(path);

      if (!stat.isDirectory()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Selected path is not a directory.",
          },
          {
            status: 400,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Workspace directory does not exist.",
        },
        {
          status: 404,
        }
      );
    }

    workspace.setRoot(path);

    invalidateIndex();

    console.log(
      "Workspace Changed:",
      path
    );

    return NextResponse.json({
      success: true,
      workspace: path,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to open workspace.",
      },
      {
        status: 500,
      }
    );
  }
}
```


=====================================================
FILE: app\api\workspace\route.ts
=====================================================

```ts
import { NextResponse } from "next/server";

import { workspace } from "@/core/filesystem/workspace";

export async function GET() {
  return NextResponse.json({
    workspace:
      workspace.getRoot(),
  });
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
  --background: oklch(0.16 0.004 49.3);
  --foreground: oklch(0.92 0.003 67.8);
  --card: oklch(0.19 0.005 43.1);
  --card-foreground: oklch(0.92 0.003 67.8);
  --popover: oklch(0.19 0.005 43.1);
  --popover-foreground: oklch(0.92 0.003 67.8);
  --primary: oklch(0.88 0.003 67.8);
  --primary-foreground: oklch(0.16 0.004 49.3);
  --secondary: oklch(0.24 0.006 43.1);
  --secondary-foreground: oklch(0.92 0.003 67.8);
  --muted: oklch(0.22 0.005 43.1);
  --muted-foreground: oklch(0.58 0.012 43.1);
  --accent: oklch(0.25 0.006 43.1);
  --accent-foreground: oklch(0.92 0.003 67.8);
  --destructive: oklch(0.62 0.16 22.2);
  --border: oklch(1 0 0 / 8%);
  --input: oklch(1 0 0 / 10%);
  --ring: oklch(0.5 0.012 43.1);
  --chart-1: oklch(0.868 0.007 39.5);
  --chart-2: oklch(0.547 0.021 43.1);
  --chart-3: oklch(0.438 0.017 39.3);
  --chart-4: oklch(0.367 0.016 35.7);
  --chart-5: oklch(0.268 0.011 36.5);
  --radius: 0.75rem;
  --sidebar: oklch(0.15 0.004 49.3);
  --sidebar-foreground: oklch(0.92 0.003 67.8);
  --sidebar-primary: oklch(0.88 0.003 67.8);
  --sidebar-primary-foreground: oklch(0.16 0.004 49.3);
  --sidebar-accent: oklch(0.22 0.005 43.1);
  --sidebar-accent-foreground: oklch(0.92 0.003 67.8);
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: oklch(0.5 0.012 43.1);
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
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-heading",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MANU",
  description: "Local AI Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
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
```


=====================================================
FILE: components\chat\ChatInput.tsx
=====================================================

```tsx
"use client";

import { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { useChatStore } from "@/store/chat.store";

export default function ChatInput() {
  const [text, setText] = useState("");
  const send = useChatStore((s) => s.sendMessage);
  const loading = useChatStore((s) => s.loading);
  const isComposing = useRef(false);

  async function handleSend() {
    if (!text.trim()) return;
    await send(text);
    setText("");
  }

  const canSend = text.trim().length > 0 && !loading;

  return (
    <div className="px-6 pb-6 pt-2">
      <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 pl-4 shadow-sm shadow-black/20 transition-colors focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-600">
        <input
          className="flex-1 bg-transparent py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          placeholder="Message MANU..."
          value={text}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={() => {
            isComposing.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposing.current) {
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
            canSend
              ? "bg-zinc-100 text-zinc-900 hover:bg-white"
              : "bg-zinc-800 text-zinc-600"
          } disabled:cursor-not-allowed`}
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
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
```


=====================================================
FILE: components\chat\CodeBlock.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\MarkdownRenderer.tsx
=====================================================

```tsx
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
```


=====================================================
FILE: components\chat\ModelSelector.tsx
=====================================================

```tsx
"use client";

import { useEffect, useState } from "react";

import { ChevronDown } from "lucide-react";

import { useModelStore } from "@/store/model.store";

export default function ModelSelector() {
  const {
    models,
    selectedModel,
    loadModels,
    setSelectedModel,
  } = useModelStore();

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
    loadModels();
  }, [loadModels]);

  if (!mounted) {
    return (
      <div className="relative inline-flex items-center">
        <div className="h-[38px] w-44 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedModel}
        aria-label="Select model"
        onChange={(e) =>
          setSelectedModel(
            e.target.value
          )
        }
        className="appearance-none cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-3 pr-8 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      >
        {models.length === 0 ? (
          <option value="">
            Loading models...
          </option>
        ) : (
          models.map((model) => (
            <option
              key={model.id}
              value={model.id}
            >
              {model.name}
            </option>
          ))
        )}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 text-zinc-500"
      />
    </div>
  );
}
```


=====================================================
FILE: components\layout\AppShell.tsx
=====================================================

```tsx
"use client";

import { useEffect } from "react";

import Sidebar from "../sidebar/Sidebar";
import MainLayout from "./MainLayout";

import WorkspaceDialog from "@/features/workspace/components/WorkspaceDialog";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

export default function AppShell() {
  const initialize = useWorkspaceStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <MainLayout />
      </div>

      <WorkspaceDialog />
    </>
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-sm">
      <span className="text-sm font-medium italic tracking-wide text-zinc-500">
        MANU
      </span>
      <ModelSelector />
    </header>
  );
}
```


=====================================================
FILE: components\layout\MainLayout.tsx
=====================================================

```tsx
"use client";

import { useState } from "react";

import Header from "./Header";

import ChatWindow from "../chat/ChatWindow";
import ChatInput from "../chat/ChatInput";

import TerminalDock from "../terminal/TerminalDock";

export default function MainLayout() {
  const [terminalOpen] =
    useState(true);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
      {/* Header */}

      <Header />

      {/* Workspace */}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Chat */}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatWindow />

          <ChatInput />
        </div>

        {/* Terminal */}

        {terminalOpen && (
          <TerminalDock />
        )}
      </div>
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
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
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

import { MessageSquare, Settings } from "lucide-react";
import WorkspaceExplorer from "@/features/workspace/components/WorkspaceExplorer";

export default function SidebarContent() {
  return (
    <div className="flex h-full flex-col px-2 py-3">
      <button className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400">
          <MessageSquare size={13} />
        </div>
        <span className="text-[13px] font-medium text-zinc-200">
          New Chat
        </span>
      </button>

      <div className="mt-4 flex-1 overflow-auto">
        <WorkspaceExplorer />
      </div>

      <button className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-zinc-900">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500">
          <Settings size={13} />
        </div>
        <span className="text-[13px] font-medium text-zinc-400">
          Settings
        </span>
      </button>
    </div>
  );
}
```


=====================================================
FILE: components\sidebar\SidebarFooter.tsx
=====================================================

```tsx
"use client";

import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

export default function SidebarFooter() {
  const tree = useWorkspaceStore((s) => s.tree);

  return (
    <div className="flex items-center gap-2 border-t border-zinc-800/80 px-4 py-3">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
      <p className="text-[11px] text-zinc-500">
        <span className="font-medium text-zinc-400">{tree.length}</span> root
        items
      </p>
    </div>
  );
}
```


=====================================================
FILE: components\sidebar\SidebarHeader.tsx
=====================================================

```tsx
"use client";

import { FolderOpen } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";
import { useWorkspaceDialogStore } from "@/features/workspace/store/dialog.store";

export default function SidebarHeader() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const show = useWorkspaceDialogStore((s) => s.show);

  return (
    <div className="border-b border-zinc-800/80 p-4">
      <h1 className="text-lg font-light italic tracking-tight text-zinc-200">
        Manu
      </h1>

      <button
        onClick={show}
        className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-900"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400">
            <FolderOpen size={13} />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </span>
        </div>
        <p className="mt-2 truncate pl-[2px] text-[13px] text-zinc-300">
          {workspace ?? "No workspace selected"}
        </p>
      </button>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalDock.tsx
=====================================================

```tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  AlertCircle,
  Bug,
  FileText,
  Terminal,
} from "lucide-react";

import { useTerminalStore } from "@/store/terminal.store";

import TerminalTabs from "./TerminalTabs";
import TerminalToolbar from "./TerminalToolbar";
import TerminalStatus from "./TerminalStatus";
import TerminalEmpty from "./TerminalEmpty";
import TerminalInput from "./TerminalInput";
import TerminalProcessList from "./TerminalProcessingList";

/**
 * IMPORTANT
 * xterm.js is browser-only.
 * Prevent SSR by dynamically importing it.
 */
const XTerm = dynamic(
  () => import("./XTerm"),
  {
    ssr: false,

    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0d1117] text-sm text-zinc-500">
        Initializing terminal...
      </div>
    ),
  }
);

type DockTab =
  | "terminal"
  | "output"
  | "problems"
  | "logs";

const TABS = [
  {
    id: "problems",
    label: "Problems",
    icon: AlertCircle,
  },
  {
    id: "output",
    label: "Output",
    icon: FileText,
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
  },
  {
    id: "logs",
    label: "Logs",
    icon: Bug,
  },
] as const;

export default function TerminalDock() {
  const [tab, setTab] =
    useState<DockTab>("terminal");

  const [
    selectedProcess,
    setSelectedProcess,
  ] = useState<number>();

  const events =
    useTerminalStore(
      (state) => state.events
    );

  async function executeCommand(
    command: string
  ) {
    try {
      await fetch(
        "/api/terminal/run",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            command,
          }),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function killProcess(
    processId: number
  ) {
    try {
      await fetch(
        "/api/terminal/stop",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            processId,
          }),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex h-80 w-full flex-col overflow-hidden border-t border-zinc-800 bg-zinc-950">
      {/* Header */}

      <div className="flex h-11 items-center justify-between border-b border-zinc-800">
        <TerminalTabs
          value={tab}
          onChange={(value) =>
            setTab(value)
          }
        />

        <TerminalToolbar />
      </div>

      {/* Body */}

      <div className="flex flex-1 overflow-hidden">
        {tab === "terminal" && (
          <>
            <div className="w-72 border-r border-zinc-800">
              <TerminalProcessList
                selectedProcess={
                  selectedProcess
                }
                onSelect={
                  setSelectedProcess
                }
                onKill={
                  killProcess
                }
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <TerminalStatus
                processId={
                  selectedProcess
                }
              />

              <div className="flex-1 overflow-hidden">
                {events.length ===
                0 ? (
                  <TerminalEmpty />
                ) : (
                  <XTerm
                    processId={
                      selectedProcess
                    }
                  />
                )}
              </div>

              <TerminalInput
                onExecute={
                  executeCommand
                }
              />
            </div>
          </>
        )}

        {tab === "output" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Output panel
          </div>
        )}

        {tab === "logs" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Logs panel
          </div>
        )}

        {tab === "problems" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            No problems found.
          </div>
        )}
      </div>

      {/* Footer */}

      <div className="flex h-8 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-500">
        <span>
          {events.length} event
          {events.length === 1
            ? ""
            : "s"}
        </span>

        <span>
          AGENTS Terminal
        </span>
      </div>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalEmpty.tsx
=====================================================

```tsx
"use client";

import { Terminal } from "lucide-react";

interface TerminalEmptyProps {
  title?: string;

  description?: string;
}

export default function TerminalEmpty({
  title = "No Active Terminal",
  description = "Run a command or let the AI execute a task to start a terminal session.",
}: TerminalEmptyProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#0d1117] px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Terminal className="h-10 w-10 text-zinc-500" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-zinc-100">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>

      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3">
        <code className="font-mono text-sm text-zinc-400">
          npm run dev
        </code>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Press Enter to execute commands from the terminal input below.
      </p>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalInput.tsx
=====================================================

```tsx
"use client";

import {
  KeyboardEvent,
  useState,
} from "react";

import {
  CornerDownLeft,
  Loader2,
} from "lucide-react";

interface TerminalInputProps {
  disabled?: boolean;

  placeholder?: string;

  onExecute?(
    command: string
  ): Promise<void> | void;
}

export default function TerminalInput({
  disabled = false,
  placeholder = "Type a command...",
  onExecute,
}: TerminalInputProps) {
  const [
    command,
    setCommand,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function execute() {
    const value =
      command.trim();

    if (
      !value ||
      loading ||
      disabled
    ) {
      return;
    }

    try {
      setLoading(true);

      await onExecute?.(
        value
      );

      setCommand("");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(
    e: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "Enter"
    ) {
      e.preventDefault();

      execute();
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
      <span className="select-none font-mono text-sm font-semibold text-green-400">
        ❯
      </span>

      <input
        value={command}
        disabled={
          disabled ||
          loading
        }
        placeholder={
          placeholder
        }
        onChange={(e) =>
          setCommand(
            e.target.value
          )
        }
        onKeyDown={
          onKeyDown
        }
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        className="flex-1 bg-transparent font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <button
        onClick={execute}
        disabled={
          disabled ||
          loading ||
          !command.trim()
        }
        className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        ) : (
          <CornerDownLeft className="h-4 w-4 text-zinc-300" />
        )}
      </button>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalOutput.tsx
=====================================================

```tsx
"use client";

import {
  Trash2,
  Square,
  Copy,
  RotateCcw,
} from "lucide-react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalToolbarProps {
  running?: boolean;

  onKill?(): void;

  onRestart?(): void;
}

export default function TerminalToolbar({
  running = false,
  onKill,
  onRestart,
}: TerminalToolbarProps) {
  const clear =
    useTerminalStore(
      (state) => state.clear
    );

  async function copyOutput() {
    const events =
      useTerminalStore.getState().events;

    const text = events
      .map((event) => event.data)
      .join("");

    try {
      await navigator.clipboard.writeText(
        text
      );
    } catch {}
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3">
      <div className="flex items-center gap-2">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            running
              ? "bg-green-500"
              : "bg-zinc-500"
          }`}
        />

        <span className="text-xs font-medium text-zinc-300">
          {running
            ? "Running"
            : "Idle"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={copyOutput}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Copy Output"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={clear}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Clear"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={onRestart}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          disabled={!running}
          onClick={onKill}
          className="rounded-md p-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          title="Kill Process"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalProcessingList.tsx
=====================================================

```tsx
"use client";

import {
  Square,
  Play,
  RefreshCw,
} from "lucide-react";

import { useMemo } from "react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalProcess {
  processId: number;
  status: "running" | "finished";
  command: string;
  exitCode?: number;
}

interface TerminalProcessListProps {
  onSelect?(
    processId: number
  ): void;

  selectedProcess?: number;

  onKill?(
    processId: number
  ): void;

  onRestart?(
    processId: number
  ): void;
}

export default function TerminalProcessList({
  onSelect,
  selectedProcess,
  onKill,
  onRestart,
}: TerminalProcessListProps) {
  const events =
    useTerminalStore(
      (state) => state.events
    );

  const processes =
    useMemo(() => {
      const map =
        new Map<
          number,
          TerminalProcess
        >();

      for (const event of events) {
        if (
          !map.has(
            event.processId
          )
        ) {
          map.set(
            event.processId,
            {
              processId:
                event.processId,

              command: "",

              status:
                "running",
            }
          );
        }

        const process =
          map.get(
            event.processId
          )!;

        if (
          event.type ===
          "start"
        ) {
          process.command =
            event.data;
        }

        if (
          event.type ===
          "exit"
        ) {
          process.status =
            "finished";

          process.exitCode =
            event.exitCode;
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (
          a,
          b
        ) =>
          b.processId -
          a.processId
      );
    }, [events]);

  if (
    !processes.length
  ) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No running processes.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {processes.map(
        (process) => (
          <button
            key={
              process.processId
            }
            onClick={() =>
              onSelect?.(
                process.processId
              )
            }
            className={`flex items-center justify-between border-b border-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-900 ${
              selectedProcess ===
              process.processId
                ? "bg-zinc-900"
                : ""
            }`}
          >
            <div className="flex flex-col">
              <span className="font-mono text-xs text-zinc-300">
                {
                  process.command
                }
              </span>

              <span className="mt-1 text-[11px] text-zinc-500">
                PID #
                {
                  process.processId
                }
              </span>
            </div>

            <div className="flex items-center gap-3">
              {process.status ===
              "running" ? (
                <>
                  <div className="flex items-center gap-1 text-green-400">
                    <Play className="h-3.5 w-3.5 fill-current" />

                    <span className="text-xs">
                      Running
                    </span>
                  </div>

                  <button
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      onKill?.(
                        process.processId
                      );
                    }}
                    className="rounded p-1 hover:bg-red-500/10"
                  >
                    <Square className="h-4 w-4 text-red-400 fill-current" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`text-xs ${
                      process.exitCode ===
                      0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    Exit{" "}
                    {
                      process.exitCode
                    }
                  </span>

                  <button
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      onRestart?.(
                        process.processId
                      );
                    }}
                    className="rounded p-1 hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-4 w-4 text-zinc-400" />
                  </button>
                </>
              )}
            </div>
          </button>
        )
      )}
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalStatus.tsx
=====================================================

```tsx
"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
} from "lucide-react";

import { useMemo } from "react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalStatusProps {
  processId?: number;
}

export default function TerminalStatus({
  processId,
}: TerminalStatusProps) {
  const events =
    useTerminalStore(
      (state) => state.events
    );

  const status =
    useMemo(() => {
      const filtered =
        events.filter((event) =>
          processId
            ? event.processId ===
              processId
            : true
        );

      if (!filtered.length) {
        return {
          state: "idle",
          text: "Idle",
          color:
            "text-zinc-400",
          icon: Clock3,
        };
      }

      const last =
        filtered[
          filtered.length - 1
        ];

      if (
        last.type === "start"
      ) {
        return {
          state:
            "running",

          text:
            "Running",

          color:
            "text-blue-400",

          icon:
            Loader2,
        };
      }

      if (
        last.type === "exit"
      ) {
        if (
          (last.exitCode ??
            0) === 0
        ) {
          return {
            state:
              "success",

            text:
              "Completed",

            color:
              "text-green-400",

            icon:
              CheckCircle2,
          };
        }

        return {
          state:
            "failed",

          text:
            "Failed",

          color:
            "text-red-400",

          icon:
            XCircle,
        };
      }

      return {
        state:
          "running",

        text:
          "Running",

        color:
          "text-blue-400",

        icon:
          Loader2,
      };
    }, [
      events,
      processId,
    ]);

  const Icon =
    status.icon;

  return (
    <div className="flex h-10 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${status.color} ${
            status.state ===
            "running"
              ? "animate-spin"
              : ""
          }`}
        />

        <span
          className={`text-sm font-medium ${status.color}`}
        >
          {status.text}
        </span>
      </div>

      <div className="text-xs text-zinc-500">
        {processId
          ? `PID ${processId}`
          : "No Process"}
      </div>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalTabs.tsx
=====================================================

```tsx
"use client";

import {
  AlertCircle,
  Bug,
  FileText,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type TerminalTab =
  | "problems"
  | "output"
  | "terminal"
  | "logs";

interface TerminalTabsProps {
  value: TerminalTab;

  onChange(
    tab: TerminalTab
  ): void;

  problemsCount?: number;

  outputCount?: number;

  terminalCount?: number;

  logsCount?: number;
}

const tabs = [
  {
    id: "problems",
    label: "Problems",
    icon: AlertCircle,
  },
  {
    id: "output",
    label: "Output",
    icon: FileText,
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
  },
  {
    id: "logs",
    label: "Logs",
    icon: Bug,
  },
] as const;

export default function TerminalTabs({
  value,
  onChange,
  problemsCount = 0,
  outputCount = 0,
  terminalCount = 0,
  logsCount = 0,
}: TerminalTabsProps) {
  function badge(
    id: TerminalTab
  ) {
    switch (id) {
      case "problems":
        return problemsCount;

      case "output":
        return outputCount;

      case "terminal":
        return terminalCount;

      case "logs":
        return logsCount;

      default:
        return 0;
    }
  }

  return (
    <div className="flex h-10 items-center border-b border-zinc-800 bg-zinc-900">
      {tabs.map(
        ({
          id,
          label,
          icon: Icon,
        }) => {
          const active =
            value === id;

          const count =
            badge(id);

          return (
            <button
              key={id}
              onClick={() =>
                onChange(id)
              }
              className={cn(
                "group flex h-full items-center gap-2 border-b-2 px-4 text-sm transition-all",

                active
                  ? "border-blue-500 bg-zinc-950 text-white"
                  : "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />

              <span>
                {label}
              </span>

              {count >
                0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",

                    active
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-700 text-zinc-200"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}
```


=====================================================
FILE: components\terminal\TerminalToolbar.tsx
=====================================================

```tsx
"use client";

import {
  Trash2,
  Square,
  Copy,
  RotateCcw,
} from "lucide-react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalToolbarProps {
  running?: boolean;

  onKill?(): void;

  onRestart?(): void;
}

export default function TerminalToolbar({
  running = false,
  onKill,
  onRestart,
}: TerminalToolbarProps) {
  const clear =
    useTerminalStore(
      (state) => state.clear
    );

  async function copyOutput() {
    const events =
      useTerminalStore.getState().events;

    const text = events
      .map((event) => event.data)
      .join("");

    try {
      await navigator.clipboard.writeText(
        text
      );
    } catch {}
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3">
      <div className="flex items-center gap-2">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            running
              ? "bg-green-500"
              : "bg-zinc-500"
          }`}
        />

        <span className="text-xs font-medium text-zinc-300">
          {running
            ? "Running"
            : "Idle"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={copyOutput}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Copy Output"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={clear}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Clear"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={onRestart}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          disabled={!running}
          onClick={onKill}
          className="rounded-md p-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          title="Kill Process"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}
```


=====================================================
FILE: components\terminal\XTerm.tsx
=====================================================

```tsx
"use client";

import {
  useEffect,
  useRef,
} from "react";

import "xterm/css/xterm.css";

import { useTerminalStore } from "@/store/terminal.store";

interface XTermProps {
  processId?: number;
}

export default function XTerm({
  processId,
}: XTermProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const terminalRef =
    useRef<any>(null);

  const fitAddonRef =
    useRef<any>(null);

  const events =
    useTerminalStore(
      (state) => state.events
    );

  // ----------------------------------
  // Initialize Terminal (Client Only)
  // ----------------------------------

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      if (!containerRef.current) {
        return;
      }

      const [
        xterm,
        fitAddonModule,
      ] = await Promise.all([
        import("xterm"),
        import(
          "@xterm/addon-fit"
        ),
      ]);

      if (disposed) {
        return;
      }

      const Terminal =
        xterm.Terminal;

      const FitAddon =
        fitAddonModule.FitAddon;

      const terminal =
        new Terminal({
          cursorBlink: true,

          convertEol: true,

          scrollback: 5000,

          fontFamily:
            "JetBrains Mono, Consolas, monospace",

          fontSize: 14,

          allowTransparency: true,

          theme: {
            background:
              "#0d1117",

            foreground:
              "#e6edf3",

            cursor:
              "#58a6ff",

            selectionBackground:
              "#264f78",
          },
        });

      const fit =
        new FitAddon();

      terminal.loadAddon(
        fit
      );

      terminal.open(
        containerRef.current
      );

      fit.fit();

      terminalRef.current =
        terminal;

      fitAddonRef.current =
        fit;

      terminal.writeln(
        "\x1b[36mAGENTS Terminal v2\x1b[0m"
      );

      terminal.writeln("");

      const resize =
        () => fit.fit();

      window.addEventListener(
        "resize",
        resize
      );

      return () => {
        window.removeEventListener(
          "resize",
          resize
        );

        terminal.dispose();
      };
    }

    const cleanup =
      initialize();

    return () => {
      disposed = true;

      cleanup.then(
        (fn) => fn?.()
      );
    };
  }, []);

  // ----------------------------------
  // Render Events
  // ----------------------------------

  useEffect(() => {
    const terminal =
      terminalRef.current;

    if (!terminal) {
      return;
    }

    terminal.clear();

    terminal.writeln(
      "\x1b[36mAGENTS Terminal v2\x1b[0m"
    );

    terminal.writeln("");

    const filtered =
      events.filter(
        (event) =>
          processId
            ? event.processId ===
              processId
            : true
      );

    for (const event of filtered) {
      switch (
        event.type
      ) {
        case "start":
          terminal.writeln(
            `\x1b[36m$ ${event.data}\x1b[0m`
          );
          break;

        case "stdout":
          terminal.write(
            event.data
          );
          break;

        case "stderr":
          terminal.write(
            `\x1b[31m${event.data}\x1b[0m`
          );
          break;

        case "exit":
          if (
            event.exitCode ===
            0
          ) {
            terminal.writeln(
              "\n\x1b[32m✔ Process exited successfully.\x1b[0m"
            );
          } else {
            terminal.writeln(
              `\n\x1b[31m✖ Process exited (${event.exitCode}).\x1b[0m`
            );
          }
          break;
      }
    }

    fitAddonRef.current?.fit();
  }, [
    events,
    processId,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#0d1117]"
    />
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
  getTree(root?: string): Promise<WorkspaceNode[]>;

  readFile(path: string): Promise<string>;

  writeFile(
    path: string,
    content: string
  ): Promise<void>;

  createFile(
    path: string,
    content?: string
  ): Promise<void>;

  deleteFile(
    path: string
  ): Promise<void>;

  createDirectory(
    path: string
  ): Promise<void>;

  rename(
    oldPath: string,
    newPath: string
  ): Promise<void>;

  exists(
    path: string
  ): Promise<boolean>;
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

  // Docs
  "docs",
  "documentation",

  // Coverage
  "coverage",

  // Cache
  ".cache",
  ".output",

  // Package managers
  ".pnpm-store",
  ".yarn",
]);

export const IGNORE_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",

  // Documentation
  "README.md",
  "AGENTS-PROJECT.md",
  "CHANGELOG.md",
  "LICENSE",

  // Lock files
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",

  // Environment
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
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
import {
  IGNORE_FILES,
  IGNORE_FOLDERS,
} from "./ignore";
import { workspace } from "./workspace";

export class LocalFileSystem
  implements FileSystemProvider
{
  private validate(target: string): string {
  const root = path.resolve(
    workspace.getRoot()
  );

  // Relative paths should be inside workspace
  const resolved = path.isAbsolute(target)
    ? path.resolve(target)
    : path.resolve(root, target);

  // Windows-safe comparison
  const normalizedRoot =
    path.normalize(root).toLowerCase();

  const normalizedResolved =
    path.normalize(resolved).toLowerCase();

  if (
    normalizedResolved !== normalizedRoot &&
    !normalizedResolved.startsWith(
      normalizedRoot + path.sep
    )
  ) {
    throw new Error(
      `Access denied.\nWorkspace: ${root}\nTarget: ${resolved}`
    );
  }

  return resolved;
}

  async getTree(
    root?: string
  ): Promise<WorkspaceNode[]> {
    const workspaceRoot =
      workspace.getRoot();

    const directory =
      this.validate(
        root ?? workspaceRoot
      );

    return this.walk(directory);
  }

  private async walk(
    directory: string
  ): Promise<WorkspaceNode[]> {
    const entries =
      await fs.readdir(directory, {
        withFileTypes: true,
      });

    const nodes: WorkspaceNode[] = [];

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORE_FOLDERS.has(
          entry.name
        )
      ) {
        continue;
      }

      if (
        entry.isFile() &&
        IGNORE_FILES.has(
          entry.name
        )
      ) {
        continue;
      }

      const absolute =
        path.join(
          directory,
          entry.name
        );

      const node: WorkspaceNode = {
        name: entry.name,
        path: absolute,
        type: entry.isDirectory()
          ? "folder"
          : "file",
      };

      if (entry.isDirectory()) {
        node.children =
          await this.walk(
            absolute
          );
      }

      nodes.push(node);
    }

    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(
          b.name
        );
      }

      return a.type === "folder"
        ? -1
        : 1;
    });

    return nodes;
  }

  async readFile(
    filePath: string
  ): Promise<string> {
    const safe =
      this.validate(filePath);

    return fs.readFile(
      safe,
      "utf8"
    );
  }

  async writeFile(
    filePath: string,
    content: string
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.writeFile(
      safe,
      content,
      "utf8"
    );
  }

  async createFile(
    filePath: string,
    content = ""
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.mkdir(
      path.dirname(safe),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      safe,
      content,
      "utf8"
    );
  }

  async deleteFile(
    filePath: string
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.rm(safe, {
      recursive: true,
      force: true,
    });
  }

  async createDirectory(
    directory: string
  ): Promise<void> {
    const safe =
      this.validate(directory);

    await fs.mkdir(safe, {
      recursive: true,
    });
  }

  async rename(
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const from =
      this.validate(oldPath);

    const to =
      this.validate(newPath);

    await fs.rename(
      from,
      to
    );
  }

  async exists(
    target: string
  ): Promise<boolean> {
    try {
      await fs.access(
        this.validate(target)
      );

      return true;
    } catch {
      return false;
    }
  }
}

export const filesystem =
  new LocalFileSystem();
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
FILE: core\filesystem\workspace.ts
=====================================================

```ts
import fs from "fs";
import path from "path";

interface WorkspaceConfig {
  root: string;
}

const CONFIG_DIR = path.join(
  process.cwd(),
  ".agents"
);

const CONFIG_FILE = path.join(
  CONFIG_DIR,
  "workspace.json"
);

class WorkspaceManager {
  private ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, {
        recursive: true,
      });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(
          {
            root: process.cwd(),
          },
          null,
          2
        )
      );
    }
  }

  getRoot(): string {
    this.ensureConfig();

    const config =
      JSON.parse(
        fs.readFileSync(
          CONFIG_FILE,
          "utf8"
        )
      ) as WorkspaceConfig;

    return path.resolve(config.root);
  }

  setRoot(root: string) {
    this.ensureConfig();

    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          root: path.resolve(root),
        },
        null,
        2
      )
    );
  }
}

export const workspace =
  new WorkspaceManager();
```


=====================================================
FILE: core\parser\extractor.ts
=====================================================

```ts
import { CodeSymbol } from "./types";

const MAX_LINES = 120;
const CONTEXT_BEFORE = 15;
const CONTEXT_AFTER = 25;
const MAX_HITS = 3;

export class ContextExtractor {
  extract(
    content: string,
    query: string,
    symbols: CodeSymbol[] = []
  ): string {
    const lower = query.trim().toLowerCase();

    if (!lower) {
      return content
        .split("\n")
        .slice(0, MAX_LINES)
        .join("\n");
    }

    // ----------------------------------
    // Exact symbol
    // ----------------------------------

    const exact = symbols.find(
      (symbol) =>
        symbol.name.toLowerCase() === lower
    );

    if (exact) {
      return exact.code;
    }

    // ----------------------------------
    // Partial symbol
    // ----------------------------------

    const partial = symbols.find(
      (symbol) =>
        symbol.name
          .toLowerCase()
          .includes(lower)
    );

    if (partial) {
      return partial.code;
    }

    // ----------------------------------
    // Keyword extraction
    // ----------------------------------

    const lines = content.split("\n");

    const snippets: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (
        !lines[i]
          .toLowerCase()
          .includes(lower)
      ) {
        continue;
      }

      const start = Math.max(
        0,
        i - CONTEXT_BEFORE
      );

      const end = Math.min(
        lines.length,
        i + CONTEXT_AFTER
      );

      snippets.push(
        lines
          .slice(start, end)
          .join("\n")
      );

      if (snippets.length >= MAX_HITS) {
        break;
      }
    }

    if (snippets.length) {
      return snippets.join(
        "\n\n====================\n\n"
      );
    }

    // ----------------------------------
    // Fallback
    // ----------------------------------

    return lines
      .slice(0, MAX_LINES)
      .join("\n");
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
        index: 3,
      },

      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/,
        index: 2,
      },

      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=.*=>/,
        index: 2,
      },

      {
        type: "class",
        regex:
          /(export\s+)?class\s+([A-Za-z0-9_]+)/,
        index: 2,
      },

      {
        type: "interface",
        regex:
          /interface\s+([A-Za-z0-9_]+)/,
        index: 1,
      },

      {
        type: "type",
        regex:
          /type\s+([A-Za-z0-9_]+)/,
        index: 1,
      },

      {
        type: "method",
        regex:
          /^\s*(public|private|protected)?\s*(static\s+)?(async\s+)?([A-Za-z0-9_]+)\s*\(/,
        index: 4,
      },

      {
        type: "method",
        regex:
          /^\s*(public|private|protected)?\s*async\s*\*\s*([A-Za-z0-9_]+)\s*\(/,
        index: 2,
      },

      {
        type: "constructor",
        regex:
          /^\s*constructor\s*\(/,
        index: -1,
      },
    ];

    const ignore = new Set([
      "if",
      "for",
      "while",
      "switch",
      "catch",
      "map",
      "filter",
      "reduce",
      "find",
      "some",
      "every",
      "set",
      "get",
      "return",
    ]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);

        if (!match) continue;

        const name =
          pattern.index === -1
            ? "constructor"
            : match[pattern.index];

        if (!name) continue;

        if (ignore.has(name)) {
          break;
        }

        let start = i;
        let end = i;

        let braces = 0;
        let started = false;

        for (let j = i; j < lines.length; j++) {
          const current = lines[j];

          for (const ch of current) {
            if (ch === "{") {
              braces++;
              started = true;
            }

            if (ch === "}") {
              braces--;
            }
          }

          if (started && braces === 0) {
            end = j;
            break;
          }
        }

        if (end <= start) {
          end = Math.min(
            lines.length - 1,
            start + 25
          );
        }

        symbols.push({
          type: pattern.type as any,
          name,
          start,
          end,
          code: lines
            .slice(start, end + 1)
            .join("\n"),
        });

        break;
      }
    }

    return symbols;
  }
}

export const codeParser = new CodeParser();
```


=====================================================
FILE: core\parser\types.ts
=====================================================

```ts
export type CodeSymbolType =
  | "function"
  | "method"
  | "constructor"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "component"
  | "variable";

export interface CodeSymbol {
  type: CodeSymbolType;

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

import { workspace } from "@/core/filesystem/workspace";

let cache: IndexedFile[] = [];

let indexed = false;

let building: Promise<
  IndexedFile[]
> | null = null;

// Track which workspace the cache belongs to
let indexedWorkspace = "";

export async function getIndex(): Promise<IndexedFile[]> {
  const currentWorkspace =
    workspace.getRoot();

  // Workspace changed -> invalidate automatically
  if (
    indexed &&
    indexedWorkspace !==
      currentWorkspace
  ) {
    invalidateIndex();
  }

  if (indexed) {
    return cache;
  }

  // Prevent concurrent rebuilds
  if (building) {
    return building;
  }

  console.time(
    "Workspace Index"
  );

  building = workspaceIndexer
    .build()
    .then((files) => {
      cache = files;

      indexed = true;

      indexedWorkspace =
        currentWorkspace;

      console.timeEnd(
        "Workspace Index"
      );

      console.log(
        `Workspace: ${indexedWorkspace}`
      );

      console.log(
        `Indexed ${files.length} files`
      );

      return cache;
    })
    .finally(() => {
      building = null;
    });

  return building;
}

export async function rebuildIndex() {
  invalidateIndex();

  return getIndex();
}

export function invalidateIndex() {
  cache = [];

  indexed = false;

  building = null;

  indexedWorkspace = "";

  console.log(
    "Workspace index invalidated."
  );
}

export function getCachedIndex(): IndexedFile[] {
  return cache;
}

export function isIndexed() {
  return indexed;
}

export function getIndexedWorkspace() {
  return indexedWorkspace;
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

import { workspace } from "@/core/filesystem/workspace";

import { codeParser } from "@/core/parser/parser";
import { CodeSymbol } from "@/core/parser/types";

import { symbolIndex } from "./symbol-index";

export interface IndexedFile {
  name: string;

  path: string;

  content: string;

  symbols: CodeSymbol[];

  modified: number;
}

export class WorkspaceIndexer {
  async build(): Promise<IndexedFile[]> {
    const files: IndexedFile[] = [];

    const root =
      workspace.getRoot();

    symbolIndex.clear();

    await this.walk(
      root,
      files
    );

    console.log(
      `Indexed ${files.length} files`
    );

    console.log(
      `Indexed ${symbolIndex.size()} symbols`
    );

    return files;
  }

  private async walk(
    directory: string,
    files: IndexedFile[]
  ) {
    const entries =
      await fs.readdir(directory, {
        withFileTypes: true,
      });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORE_FOLDERS.has(
          entry.name
        )
      ) {
        continue;
      }

      if (
        entry.isFile() &&
        IGNORE_FILES.has(
          entry.name
        )
      ) {
        continue;
      }

      const absolute =
        path.join(
          directory,
          entry.name
        );

      if (entry.isDirectory()) {
        await this.walk(
          absolute,
          files
        );

        continue;
      }

      try {
        const stat =
          await fs.stat(
            absolute
          );

        const content =
          await fs.readFile(
            absolute,
            "utf8"
          );

        const symbols =
          codeParser.parse(
            content
          );

        const file: IndexedFile = {
          name: entry.name,

          path: absolute,

          content,

          symbols,

          modified:
            stat.mtimeMs,
        };

        files.push(file);

        symbolIndex.add(file);
      } catch (error) {
        console.warn(
          "Skipped:",
          absolute,
          error
        );
      }
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
  const q = query
    .trim()
    .toLowerCase();

  const tokens = q
    .split(/\s+/)
    .filter(Boolean);

  return files
    .map((file) => {
      let score = 0;

      const fileName =
        file.name.toLowerCase();

      const filePath =
        file.path.toLowerCase();

      const content =
        file.content.toLowerCase();

      // -----------------------------
      // Filename
      // -----------------------------

      if (fileName === q) {
        score += 2500;
      } else if (
        fileName.startsWith(q)
      ) {
        score += 1200;
      } else if (
        fileName.includes(q)
      ) {
        score += 700;
      }

      // -----------------------------
      // Symbols
      // -----------------------------

      for (const symbol of file.symbols) {
        const name =
          symbol.name.toLowerCase();

        if (name === q) {
          score += 5000;
          continue;
        }

        if (
          name.startsWith(q)
        ) {
          score += 2500;
          continue;
        }

        if (
          name.includes(q)
        ) {
          score += 1200;
        }
      }

      // -----------------------------
      // Path
      // -----------------------------

      if (
        filePath === q
      ) {
        score += 1500;
      } else if (
        filePath.includes(q)
      ) {
        score += 300;
      }

      // -----------------------------
      // Token scoring
      // -----------------------------

      for (const token of tokens) {
        if (
          fileName.includes(token)
        ) {
          score += 100;
        }

        if (
          filePath.includes(token)
        ) {
          score += 30;
        }

        if (
          content.includes(token)
        ) {
          score += 10;
        }
      }

      // -----------------------------
      // Extension boost
      // -----------------------------

      if (
        fileName.endsWith(".ts")
      )
        score += 20;

      if (
        fileName.endsWith(".tsx")
      )
        score += 15;

      // -----------------------------
      // Prefer shallow files
      // -----------------------------

      score -=
        filePath.split(/[\\/]/)
          .length * 2;

      return {
        ...file,
        score,
      };
    })
    .filter(
      (file) => file.score > 0
    )
    .sort((a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.path.length -
        b.path.length
      );
    });
}
```


=====================================================
FILE: core\search\search.ts
=====================================================

```ts
import {
  getIndex,
  isIndexed,
} from "./cache";

import {
  rankResults,
  SearchResult,
} from "./ranking";

import { symbolIndex } from "./symbol-index";

export class WorkspaceSearch {
  async search(
    query: string
  ): Promise<SearchResult[]> {
    query = query.trim();

    if (!query) {
      return [];
    }

    console.time("Workspace Search");

    const files =
      await getIndex();

    // -----------------------------
    // Fast Symbol Lookup
    // -----------------------------
    const symbolFiles =
      symbolIndex.find(query);

    if (symbolFiles.length) {
      console.timeEnd(
        "Workspace Search"
      );

      console.log(
        `Symbol hit: ${query}`
      );

      return symbolFiles.map(
        (file) => ({
          ...file,
          score: 999999,
        })
      );
    }

    // -----------------------------
    // Fallback Ranking
    // -----------------------------
    const results =
      rankResults(
        files,
        query
      );

    console.timeEnd(
      "Workspace Search"
    );

    console.log(
      `Query: "${query}"`
    );

    console.log(
      `Indexed: ${isIndexed()}`
    );

    console.log(
      `Files: ${files.length}`
    );

    console.log(
      `Results: ${results.length}`
    );

    return results;
  }
}

export const workspaceSearch =
  new WorkspaceSearch();
```


=====================================================
FILE: core\search\symbol-index.ts
=====================================================

```ts
import { IndexedFile } from "./indexer";

export class SymbolIndex {
  private index = new Map<
    string,
    IndexedFile[]
  >();

  clear() {
    this.index.clear();
  }

  add(file: IndexedFile) {
    for (const symbol of file.symbols) {
      const key =
        symbol.name.toLowerCase();

      const existing =
        this.index.get(key) ??
        [];

      existing.push(file);

      this.index.set(
        key,
        existing
      );
    }
  }

  find(
    query: string
  ): IndexedFile[] {
    return (
      this.index.get(
        query.toLowerCase()
      ) ?? []
    );
  }

  has(
    query: string
  ) {
    return this.index.has(
      query.toLowerCase()
    );
  }

  size() {
    return this.index.size;
  }
}

export const symbolIndex =
  new SymbolIndex();
```


=====================================================
FILE: core\terminal\local-terminal.ts
=====================================================

```ts
import { spawn } from "child_process";

import { workspace } from "../filesystem/workspace";

import { processManager } from "./ProcessManager";
import { terminalHistory } from "./TerminalHistory";
import { shellDetector } from "./ShellDetector";

import {
  TerminalProvider,
  TerminalResult,
  TerminalRunOptions,
} from "./types";

export class LocalTerminal
  implements TerminalProvider
{
  async run(
    command: string,
    options?: TerminalRunOptions
  ): Promise<TerminalResult> {
    const cwd =
      options?.cwd ??
      workspace.getRoot();

    const start = Date.now();

    const shell =
      shellDetector.detect();

    const child = spawn(
      shell.executable,
      [...shell.args, command],
      {
        cwd,
        env: {
          ...process.env,
          ...options?.env,
        },
        windowsHide: true,
      }
    );

    const processInfo =
      processManager.register(
        child,
        command,
        cwd
      );

    terminalHistory.add({
      id: processInfo.id,
      command,
      cwd,
      startedAt: Date.now(),
    });

    return new Promise(
      (resolve) => {
        child.on(
          "close",
          (code) => {
            const exitCode =
              code ?? 0;

            terminalHistory.finish(
              processInfo.id,
              exitCode
            );

            const logs =
              processManager.getLogs(
                processInfo.id
              );

            resolve({
              success:
                exitCode === 0,

              processId:
                processInfo.id,

              command,

              stdout:
                logs?.stdout ??
                "",

              stderr:
                logs?.stderr ??
                "",

              exitCode,

              duration:
                Date.now() -
                start,
            });
          }
        );
      }
    );
  }

  async stop(
    processId: number
  ): Promise<boolean> {
    return processManager.kill(
      processId
    );
  }

  async list() {
    return processManager.list();
  }

  async logs(
    processId: number
  ) {
    return processManager.getLogs(
      processId
    );
  }
}
```


=====================================================
FILE: core\terminal\ProcessManager.ts
=====================================================

```ts
import { ChildProcess } from "child_process";

import { terminalEvents } from "./TerminalEvents";

export interface ProcessInfo {
  id: number;

  command: string;

  cwd: string;

  process: ChildProcess;

  startedAt: number;

  status:
    | "running"
    | "finished"
    | "failed"
    | "killed";

  exitCode?: number | null;

  stdout: string;

  stderr: string;
}

export class ProcessManager {
  private nextId = 1;

  private readonly processes =
    new Map<number, ProcessInfo>();

  register(
    process: ChildProcess,
    command: string,
    cwd: string
  ): ProcessInfo {
    const info: ProcessInfo = {
      id: this.nextId++,

      command,

      cwd,

      process,

      startedAt: Date.now(),

      status: "running",

      stdout: "",

      stderr: "",
    };

    this.processes.set(
      info.id,
      info
    );

    // ----------------------------------
    // PROCESS START
    // ----------------------------------

    terminalEvents.emit({
      processId: info.id,
      type: "start",
      data: command,
      timestamp: Date.now(),
    });

    // ----------------------------------
    // STDOUT
    // ----------------------------------

    process.stdout?.on(
      "data",
      (chunk: Buffer | string) => {
        const text =
          chunk.toString();

        info.stdout += text;

        terminalEvents.emit({
          processId: info.id,
          type: "stdout",
          data: text,
          timestamp:
            Date.now(),
        });
      }
    );

    // ----------------------------------
    // STDERR
    // ----------------------------------

    process.stderr?.on(
      "data",
      (chunk: Buffer | string) => {
        const text =
          chunk.toString();

        info.stderr += text;

        terminalEvents.emit({
          processId: info.id,
          type: "stderr",
          data: text,
          timestamp:
            Date.now(),
        });
      }
    );

    // ----------------------------------
    // EXIT
    // ----------------------------------

    process.on(
      "exit",
      (code) => {
        info.exitCode = code;

        info.status =
          code === 0
            ? "finished"
            : "failed";

        terminalEvents.emit({
          processId: info.id,
          type: "exit",
          data: "",
          exitCode:
            code ?? 0,
          timestamp:
            Date.now(),
        });
      }
    );

    process.on(
      "error",
      (error) => {
        info.status =
          "failed";

        terminalEvents.emit({
          processId: info.id,
          type: "stderr",
          data:
            error.message,
          timestamp:
            Date.now(),
        });
      }
    );

    return info;
  }

  get(
    id: number
  ): ProcessInfo | undefined {
    return this.processes.get(
      id
    );
  }

  list(): ProcessInfo[] {
    return Array.from(
      this.processes.values()
    ).sort(
      (a, b) =>
        b.startedAt -
        a.startedAt
    );
  }

  isRunning(
    id: number
  ): boolean {
    return (
      this.get(id)
        ?.status ===
      "running"
    );
  }

  kill(
    id: number
  ): boolean {
    const info =
      this.get(id);

    if (
      !info ||
      info.status !==
        "running"
    ) {
      return false;
    }

    info.process.kill();

    info.status =
      "killed";

    terminalEvents.emit({
      processId: info.id,
      type: "exit",
      data: "Killed",
      exitCode: -1,
      timestamp:
        Date.now(),
    });

    return true;
  }

  remove(
    id: number
  ) {
    this.processes.delete(
      id
    );
  }

  clearFinished() {
    for (const [
      id,
      process,
    ] of this.processes) {
      if (
        process.status !==
        "running"
      ) {
        this.processes.delete(
          id
        );
      }
    }
  }

  getLogs(
    id: number
  ) {
    const info =
      this.get(id);

    if (!info) {
      return null;
    }

    return {
      stdout:
        info.stdout,

      stderr:
        info.stderr,
    };
  }
}

export const processManager =
  new ProcessManager();
```


=====================================================
FILE: core\terminal\registry.ts
=====================================================

```ts

```


=====================================================
FILE: core\terminal\ShellDetector.ts
=====================================================

```ts
import os from "os";

export interface ShellInfo {
  shell: string;

  executable: string;

  args: string[];
}

export class ShellDetector {
  detect(): ShellInfo {
    // Windows
    if (process.platform === "win32") {
      const comspec =
        process.env.ComSpec ??
        "C:\\Windows\\System32\\cmd.exe";

      if (
        comspec
          .toLowerCase()
          .includes("powershell")
      ) {
        return {
          shell: "powershell",

          executable: comspec,

          args: [
            "-NoLogo",
            "-NoProfile",
            "-Command",
          ],
        };
      }

      return {
        shell: "cmd",

        executable: comspec,

        args: ["/c"],
      };
    }

    // macOS / Linux

    const shell =
      process.env.SHELL ??
      "/bin/bash";

    return {
      shell: shell.split("/").pop() ?? "bash",

      executable: shell,

      args: ["-c"],
    };
  }

  getName(): string {
    return this.detect().shell;
  }

  getExecutable(): string {
    return this.detect().executable;
  }

  isWindows() {
    return process.platform === "win32";
  }

  isLinux() {
    return process.platform === "linux";
  }

  isMac() {
    return process.platform === "darwin";
  }

  platform() {
    return os.platform();
  }
}

export const shellDetector =
  new ShellDetector();

```


=====================================================
FILE: core\terminal\StreamManager.ts
=====================================================

```ts
import { terminalEvents } from "./TerminalEvents";

export interface ProcessStream {
  processId: number;

  stdout: string;

  stderr: string;

  startedAt: number;

  updatedAt: number;

  finished: boolean;

  exitCode?: number;
}


// Actual terminal event type
export interface StreamEvent {
  processId: number;

  type:
    | "start"
    | "stdout"
    | "stderr"
    | "exit";

  data: string;

  exitCode?: number;

  timestamp: number;
}

class StreamManager {
  private readonly streams =
    new Map<number, ProcessStream>();

  private readonly listeners =
    new Set<
      (event: StreamEvent) => void
    >();

  constructor() {
    terminalEvents.onTerminal(
      (event: StreamEvent) => {
        let stream =
          this.streams.get(
            event.processId
          );

        if (!stream) {
          stream = {
            processId:
              event.processId,

            stdout: "",

            stderr: "",

            startedAt:
              Date.now(),

            updatedAt:
              Date.now(),

            finished: false,
          };

          this.streams.set(
            event.processId,
            stream
          );
        }

        stream.updatedAt =
          Date.now();

        switch (event.type) {
          case "stdout":
            stream.stdout +=
              event.data;
            break;

          case "stderr":
            stream.stderr +=
              event.data;
            break;

          case "exit":
            stream.finished =
              true;

            stream.exitCode =
              event.exitCode;
            break;
        }

        // 🔥 Broadcast live
        for (const listener of this.listeners) {
          listener(event);
        }
      }
    );
  }

  subscribe(
    listener: (
      event: StreamEvent
    ) => void
  ) {
    this.listeners.add(
      listener
    );

    return () =>
      this.listeners.delete(
        listener
      );
  }

  get(
    processId: number
  ) {
    return this.streams.get(
      processId
    );
  }

  stdout(
    processId: number
  ) {
    return (
      this.streams.get(
        processId
      )?.stdout ?? ""
    );
  }

  stderr(
    processId: number
  ) {
    return (
      this.streams.get(
        processId
      )?.stderr ?? ""
    );
  }

  list() {
    return Array.from(
      this.streams.values()
    );
  }

  clear(
    processId: number
  ) {
    this.streams.delete(
      processId
    );
  }

  clearFinished() {
    for (const [
      id,
      stream,
    ] of this.streams) {
      if (stream.finished) {
        this.streams.delete(
          id
        );
      }
    }
  }

  clearAll() {
    this.streams.clear();
  }
}

export const streamManager =
  new StreamManager();
```


=====================================================
FILE: core\terminal\terminal.ts
=====================================================

```ts
import { LocalTerminal } from "./local-terminal";
import { TerminalProvider } from "./types";

/**
 * Global singleton terminal instance.
 *
 * This removes the need for runtime registration and prevents:
 * "Cannot read properties of undefined (reading 'run')"
 */

export const terminal: TerminalProvider =
  new LocalTerminal();
```


=====================================================
FILE: core\terminal\TerminalEvents.ts
=====================================================

```ts
import { EventEmitter } from "events";

export interface TerminalEvent {
  processId: number;

  type:
    | "start"
    | "stdout"
    | "stderr"
    | "exit";

  data: string;

  exitCode?: number;

  timestamp: number;
}

type TerminalListener = (
  event: TerminalEvent
) => void;

export class TerminalEvents {
  private readonly emitter =
    new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(
      100
    );
  }

  // ----------------------------------
  // Emit
  // ----------------------------------

  emit(
    event: TerminalEvent
  ) {
    this.emitter.emit(
      "terminal",
      event
    );

    this.emitter.emit(
      `process:${event.processId}`,
      event
    );
  }

  // ----------------------------------
  // Global Stream
  // ----------------------------------

  onTerminal(
    listener: TerminalListener
  ) {
    this.emitter.on(
      "terminal",
      listener
    );

    return () =>
      this.offTerminal(
        listener
      );
  }

  onceTerminal(
    listener: TerminalListener
  ) {
    this.emitter.once(
      "terminal",
      listener
    );
  }

  offTerminal(
    listener: TerminalListener
  ) {
    this.emitter.off(
      "terminal",
      listener
    );
  }

  // ----------------------------------
  // Process Stream
  // ----------------------------------

  onProcess(
    processId: number,
    listener: TerminalListener
  ) {
    const event =
      `process:${processId}`;

    this.emitter.on(
      event,
      listener
    );

    return () =>
      this.offProcess(
        processId,
        listener
      );
  }

  onceProcess(
    processId: number,
    listener: TerminalListener
  ) {
    this.emitter.once(
      `process:${processId}`,
      listener
    );
  }

  offProcess(
    processId: number,
    listener: TerminalListener
  ) {
    this.emitter.off(
      `process:${processId}`,
      listener
    );
  }

  // ----------------------------------
  // Utils
  // ----------------------------------

  listenerCount() {
    return this.emitter.listenerCount(
      "terminal"
    );
  }

  clearProcess(
    processId: number
  ) {
    this.emitter.removeAllListeners(
      `process:${processId}`
    );
  }

  clearAll() {
    this.emitter.removeAllListeners(
      "terminal"
    );
  }
}

export const terminalEvents =
  new TerminalEvents();
```


=====================================================
FILE: core\terminal\TerminalHistory.ts
=====================================================

```ts
export interface HistoryEntry {
  id: number;

  command: string;

  cwd: string;

  startedAt: number;

  finishedAt?: number;

  exitCode?: number;
}

export class TerminalHistory {
  private history: HistoryEntry[] =
    [];

  add(
    entry: HistoryEntry
  ) {
    this.history.unshift(entry);

    if (
      this.history.length > 500
    ) {
      this.history.pop();
    }
  }

  finish(
    id: number,
    exitCode: number
  ) {
    const command =
      this.history.find(
        (item) => item.id === id
      );

    if (!command) {
      return;
    }

    command.exitCode =
      exitCode;

    command.finishedAt =
      Date.now();
  }

  all() {
    return [...this.history];
  }

  latest(
    count = 20
  ) {
    return this.history.slice(
      0,
      count
    );
  }

  clear() {
    this.history = [];
  }

  get(id: number) {
    return this.history.find(
      (item) => item.id === id
    );
  }
}

export const terminalHistory =
  new TerminalHistory();
```


=====================================================
FILE: core\terminal\TerminalSession.ts
=====================================================

```ts
import { spawn, ChildProcess } from "child_process";

import { workspace } from "../filesystem/workspace";

import { processManager } from "./ProcessManager";

export interface TerminalSessionResult {
  id: number;

  process: ChildProcess;
}

export class TerminalSession {
  run(
    command: string,
    cwd = workspace.getRoot()
  ): TerminalSessionResult {
    const shell =
      process.platform === "win32"
        ? "cmd.exe"
        : "/bin/bash";

    const shellArgs =
      process.platform === "win32"
        ? ["/c", command]
        : ["-c", command];

    const child = spawn(shell, shellArgs, {
      cwd,
      env: process.env,
      windowsHide: true,

      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
    });

    const info =
      processManager.register(
        child,
        command,
        cwd
      );

    console.log(
      `\n[Terminal] Started PID ${info.id}`
    );

    console.log(
      `[Terminal] ${command}\n`
    );

    return {
      id: info.id,

      process: child,
    };
  }

  stop(id: number): boolean {
    return processManager.kill(id);
  }

  list() {
    return processManager.list();
  }

  logs(id: number) {
    return processManager.getLogs(id);
  }

  get(id: number) {
    return processManager.get(id);
  }
}

export const terminalSession =
  new TerminalSession();
```


=====================================================
FILE: core\terminal\types.ts
=====================================================

```ts
export type ProcessStatus =
  | "running"
  | "finished"
  | "failed"
  | "killed";

export interface TerminalRunOptions {
  cwd?: string;

  env?: NodeJS.ProcessEnv;

  timeout?: number;

  background?: boolean;
}

export interface TerminalProcess {
  id: number;

  command: string;

  cwd: string;

  status: ProcessStatus;

  startedAt: number;

  exitCode?: number | null;

  stdout: string;

  stderr: string;
}

export interface TerminalStreamChunk {
  processId: number;

  type:
    | "stdout"
    | "stderr";

  data: string;
}

export interface TerminalResult {
  success: boolean;

  processId?: number;

  command: string;

  stdout: string;

  stderr: string;

  exitCode: number;

  duration: number;
}

export interface TerminalProvider {
  run(
    command: string,
    options?: TerminalRunOptions
  ): Promise<TerminalResult>;

  stop(
    processId: number
  ): Promise<boolean>;

  list(): Promise<
    TerminalProcess[]
  >;

  logs(
    processId: number
  ): Promise<{
    stdout: string;
    stderr: string;
  } | null>;
}
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

export default function FileIcon({ type, expanded = false }: Props) {
  if (type === "file") {
    return <File size={14} className="shrink-0 text-zinc-500" />;
  }

  return expanded ? (
    <FolderOpen size={14} className="shrink-0 text-amber-500/70" />
  ) : (
    <Folder size={14} className="shrink-0 text-amber-500/70" />
  );
}
```


=====================================================
FILE: features\workspace\components\WorkspaceDialog.tsx
=====================================================

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceDialogStore } from "../store/dialog.store";
import { useWorkspaceStore } from "../store/workspace.store";

export default function WorkspaceDialog() {
  const open = useWorkspaceDialogStore((s) => s.open);
  const hide = useWorkspaceDialogStore((s) => s.hide);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const recent = useWorkspaceStore((s) => s.recentWorkspaces);
  const loading = useWorkspaceStore((s) => s.loading);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  async function openWorkspace() {
    const value = path.trim();
    if (!value) {
      setError("Please enter a workspace path.");
      return;
    }
    try {
      setError("");
      await setWorkspace(value);
      setPath("");
      hide();
    } catch {
      setError("Unable to open workspace.");
    }
  }

  async function openRecent(value: string) {
    try {
      await setWorkspace(value);
      hide();
    } catch {}
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          hide();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium tracking-tight text-zinc-100">
            Open Workspace
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            Select the project you want MANU to work on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Current Workspace
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-300">
              {workspace ?? "No workspace selected"}
            </div>
          </div>

          {/* Path */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Workspace Path
            </p>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="C:\Projects\MyApp"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  openWorkspace();
                }
              }}
              className="border-zinc-800 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <Button
            onClick={openWorkspace}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Opening..." : "Open Workspace"}
          </Button>

          {/* Recent */}
          {recent.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Recent Workspaces
              </p>
              <div className="space-y-1.5">
                {recent.map((item) => (
                  <button
                    key={item}
                    onClick={() => openRecent(item)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const tree = useWorkspaceStore((s) => s.tree);
  const loadTree = useWorkspaceStore((s) => s.loadTree);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  if (tree.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[12px] text-zinc-600">No files to show</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-2 py-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.700)_transparent]">
      {tree.map((node) => (
        <WorkspaceNode key={node.path} node={node} />
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
import { ChevronRight } from "lucide-react";
import FileIcon from "./FileIcon";
import { WorkspaceNode as Node } from "../services/workspace.service";
import { useWorkspaceStore } from "../store/workspace.store";

interface Props {
  node: Node;
}

export default function WorkspaceNode({ node }: Props) {
  const [expanded, setExpanded] = useState(false);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-zinc-300 transition-colors duration-150 hover:bg-zinc-900"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            // TODO: hook up active/selected file styling once the
            // workspace store exposes a selected/open path.
            openFile(node.path);
          }
        }}
      >
        {isFolder ? (
          <ChevronRight
            size={12}
            className={`shrink-0 text-zinc-600 transition-transform duration-150 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <FileIcon type={node.type} expanded={expanded} />
        <span className="truncate text-zinc-300 group-hover:text-zinc-100">
          {node.name}
        </span>
      </button>

      {expanded &&
        node.children?.map((child) => (
          <div
            key={child.path}
            className="ml-3 border-l border-zinc-800/60 pl-2"
          >
            <WorkspaceNode node={child} />
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
  // -----------------------------
  // Workspace
  // -----------------------------

  async openWorkspace(
    path: string
  ): Promise<void> {
    const response = await fetch(
      "/api/workspace/open",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          path,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to open workspace."
      );
    }
  }

  async getCurrentWorkspace(): Promise<string | null> {
    const response = await fetch(
      "/api/workspace"
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.workspace ?? null;
  }

  // -----------------------------
  // Explorer
  // -----------------------------

  async getTree(): Promise<WorkspaceNode[]> {
    const response = await fetch(
      "/api/workspace/tree"
    );

    if (!response.ok) {
      throw new Error(
        "Failed to load workspace tree."
      );
    }

    const data =
      await response.json();

    return data.tree;
  }

  // -----------------------------
  // File Reader
  // -----------------------------

  async readFile(
    path: string
  ): Promise<string> {
    const response = await fetch(
      `/api/workspace/file?path=${encodeURIComponent(
        path
      )}`
    );

    if (!response.ok) {
      throw new Error(
        "Failed to read file."
      );
    }

    const data =
      await response.json();

    return data.content;
  }
}

export const workspaceService =
  new WorkspaceService();
```


=====================================================
FILE: features\workspace\store\dialog.store.ts
=====================================================

```ts
import { create } from "zustand";

interface WorkspaceDialogStore {
  open: boolean;

  show(): void;

  hide(): void;

  toggle(): void;
}

export const useWorkspaceDialogStore =
  create<WorkspaceDialogStore>((set) => ({
    open: false,

    show() {
      set({
        open: true,
      });
    },

    hide() {
      set({
        open: false,
      });
    },

    toggle() {
      set((state) => ({
        open: !state.open,
      }));
    },
  }));
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
  // Workspace

  workspace: string | null;

  recentWorkspaces: string[];

  // Explorer

  tree: WorkspaceNode[];

  // Editor

  selectedFile: string | null;

  fileContent: string;

  loading: boolean;

  // Actions

  initialize(): Promise<void>;

  setWorkspace(
    path: string
  ): Promise<void>;

  loadTree(): Promise<void>;

  openFile(
    path: string
  ): Promise<void>;

  clearWorkspace(): void;
}

export const useWorkspaceStore =
  create<WorkspaceStore>((set, get) => ({
    workspace: null,

    recentWorkspaces: [],

    tree: [],

    selectedFile: null,

    fileContent: "",

    loading: false,

    async initialize() {
      if (typeof window === "undefined") {
        return;
      }

      const workspace =
        localStorage.getItem(
          "workspace"
        );

      const recent = JSON.parse(
        localStorage.getItem(
          "recent-workspaces"
        ) ?? "[]"
      );

      set({
        workspace,
        recentWorkspaces: recent,
      });

      if (workspace) {
        await get().loadTree();
      }
    },

    async setWorkspace(path) {
      try {
        set({
          loading: true,
        });

        await workspaceService.openWorkspace(
          path
        );

        const recent = [
          path,
          ...get().recentWorkspaces.filter(
            (p) => p !== path
          ),
        ].slice(0, 10);

        localStorage.setItem(
          "workspace",
          path
        );

        localStorage.setItem(
          "recent-workspaces",
          JSON.stringify(recent)
        );

        set({
          workspace: path,
          recentWorkspaces: recent,
        });

        await get().loadTree();
      } catch (error) {
        console.error(error);
      } finally {
        set({
          loading: false,
        });
      }
    },

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

    async openFile(path) {
      try {
        set({
          loading: true,
        });

        const content =
          await workspaceService.readFile(
            path
          );

        set({
          selectedFile: path,
          fileContent: content,
        });
      } catch (error) {
        console.error(error);
      } finally {
        set({
          loading: false,
        });
      }
    },

    clearWorkspace() {
      if (typeof window !== "undefined") {
        localStorage.removeItem(
          "workspace"
        );

        localStorage.removeItem(
          "recent-workspaces"
        );
      }

      set({
        workspace: null,
        recentWorkspaces: [],
        tree: [],
        selectedFile: null,
        fileContent: "",
      });
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

export class OllamaProvider
  implements AIProvider
{
  async chat(
    request: ChatCompletionRequest
  ): Promise<string> {
    try {
      const response = await ollama.chat({
        model: request.model,
        stream: false,

        options: {
          temperature: 0.2,
        },

        messages: request.messages,
      });

      return response.message.content;
    } catch (error) {
      console.error(
        "Ollama Chat Error:",
        error
      );

      throw error;
    }
  }

  async *stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string> {
    try {
      console.time("llm");

      const stream = await ollama.chat({
        model: request.model,
        stream: true,

        options: {
          temperature: 0.2,
        },

        messages: request.messages,
      });

      console.timeEnd("llm");

      for await (const chunk of stream) {
        const token =
          chunk.message.content ?? "";

        if (!token) continue;

        yield token;
      }
    } catch (error) {
      console.error(
        "Streaming Error:",
        error
      );

      throw error;
    }
  }

  async listModels(): Promise<
    AIModel[]
  > {
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

export interface StreamEvent {
  type:
    | "assistant"
    | "terminal"
    | "system";

  data: any;
}

export interface StreamOptions {
  model?: string;

  messages: AIMessage[];

  onEvent(
    event: StreamEvent
  ): void;
}

export class ChatService {
  async streamMessage({
    model = "qwen3:4b",
    messages,
    onEvent,
  }: StreamOptions): Promise<void> {
    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model,
            messages,
          }),
        }
      );

    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status})`
      );
    }

    if (!response.body) {
      throw new Error(
        "Response body is empty."
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    try {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() ?? "";

        for (const line of lines) {
          const trimmed =
            line.trim();

          if (!trimmed) {
            continue;
          }

          try {
            const event: StreamEvent =
              JSON.parse(
                trimmed
              );

            onEvent(event);
          } catch {
            onEvent({
              type:
                "assistant",

              data: trimmed,
            });
          }
        }
      }

      const remaining =
        decoder.decode();

      if (remaining) {
        buffer += remaining;
      }

      if (buffer.trim()) {
        try {
          const event: StreamEvent =
            JSON.parse(
              buffer.trim()
            );

          onEvent(event);
        } catch {
          onEvent({
            type:
              "assistant",

            data:
              buffer.trim(),
          });
        }
      }
    } catch (error) {
      console.error(
        "[ChatService]",
        error
      );

      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}

export const chatService =
  new ChatService();
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

import {
  chatService,
  StreamEvent,
} from "@/services/chat/chat.service";

import { ChatMessage } from "@/types/chat";

import { useModelStore } from "./model.store";
import { useTerminalStore } from "./terminal.store";

interface ChatStore {
  messages: ChatMessage[];

  loading: boolean;

  error: string | null;

  sendMessage(
    content: string
  ): Promise<void>;

  clearMessages(): void;
}

const SYSTEM_PROMPT = `You are AGENTS.

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
- Think step by step before answering.`;

export const useChatStore =
  create<ChatStore>((set, get) => ({
    messages: [],

    loading: false,

    error: null,

    async sendMessage(
      content: string
    ) {
      if (!content.trim()) {
        return;
      }

      const userMessage: ChatMessage =
      {
        id: crypto.randomUUID(),

        role: "user",

        content,

        createdAt:
          Date.now(),
      };

      const assistantId =
        crypto.randomUUID();

      const assistantMessage: ChatMessage =
      {
        id: assistantId,

        role: "assistant",

        content: "",

        createdAt:
          Date.now(),
      };

      set((state) => ({
        messages: [
          ...state.messages,
          userMessage,
          assistantMessage,
        ],

        loading: true,

        error: null,
      }));

      try {
        const history =
          get()
            .messages.filter(
              (
                message
              ) =>
                !(
                  message.id ===
                  assistantId &&
                  message.content ===
                  ""
                )
            )
            .map(
              (
                message
              ) => ({
                role:
                  message.role,

                content:
                  message.content,
              })
            );

        await chatService.streamMessage(
          {
            model:
              useModelStore.getState()
                .selectedModel,

            messages: [
              {
                role:
                  "system",

                content:
                  SYSTEM_PROMPT,
              },

              ...history,
            ],

            onEvent: (
              event: StreamEvent
            ) => {
              switch (
              event.type
              ) {
                // --------------------------------
                // Assistant Stream
                // --------------------------------

                case "assistant": {
                  set(
                    (
                      state
                    ) => ({
                      messages:
                        state.messages.map(
                          (
                            message
                          ) =>
                            message.id ===
                              assistantId
                              ? {
                                ...message,

                                content:
                                  message.content +
                                  String(
                                    event.data ??
                                    ""
                                  ),
                              }
                              : message
                        ),
                    })
                  );

                  break;
                }

                // --------------------------------
                // Terminal Events
                // --------------------------------

                case "terminal": {
                  useTerminalStore
                    .getState()
                    .append(event.data);

                  break;
                }

                // --------------------------------
                // System Events
                // --------------------------------

                case "system": {
                  console.log(
                    "[System]",
                    event.data
                  );

                  break;
                }

                default:
                  break;
              }
            },
          }
        );

        set({
          loading: false,
        });
      } catch (error) {
        console.error(error);

        set(
          (
            state
          ) => ({
            loading: false,

            error:
              "Failed to generate response.",

            messages:
              state.messages.filter(
                (
                  message
                ) =>
                  message.id !==
                  assistantId
              ),
          })
        );
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
FILE: store\terminal.store.ts
=====================================================

```ts
// src/stores/terminal.store.ts

import { create } from "zustand";

export interface TerminalOutput {
  processId: number;

  type:
    | "stdout"
    | "stderr"
    | "start"
    | "exit";

  data: string;

  timestamp: number;

  exitCode?: number;
}

interface TerminalStore {
  events: TerminalOutput[];

  append(
    event: TerminalOutput
  ): void;

  clear(): void;

  clearProcess(
    processId: number
  ): void;
}

export const useTerminalStore =
  create<TerminalStore>(
    (set) => ({
      events: [],

      append(event) {
        set((state) => ({
          events: [
            ...state.events,
            event,
          ],
        }));
      },

      clear() {
        set({
          events: [],
        });
      },

      clearProcess(
        processId
      ) {
        set((state) => ({
          events:
            state.events.filter(
              (e) =>
                e.processId !==
                processId
            ),
        }));
      },
    })
  );
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
