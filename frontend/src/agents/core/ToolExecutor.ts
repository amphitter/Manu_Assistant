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