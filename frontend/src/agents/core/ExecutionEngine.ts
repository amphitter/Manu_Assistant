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