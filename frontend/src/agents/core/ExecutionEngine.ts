import { ToolCall, ToolResult } from "../types";
import { ToolExecutor } from "./ToolExecutor";

export interface ExecutionResult {
  success: boolean;

  results: ToolResult[];

  summary: string;
}

export class ExecutionEngine {
  private readonly executor =
    new ToolExecutor();

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

    console.log(
      "\n========== EXECUTION =========="
    );

    console.log(
      `Executing ${toolCalls.length} tool call(s)...`
    );

    const results =
      await this.executor.execute(
        toolCalls
      );

    console.dir(results, {
      depth: null,
    });

    console.log(
      "===============================\n"
    );

    const success =
      results.every(
        (result) => result.success
      );

    const summary = results
      .map((result) => {
        const icon = result.success
          ? "✓"
          : "✗";

        return `${icon} ${result.action}`;
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