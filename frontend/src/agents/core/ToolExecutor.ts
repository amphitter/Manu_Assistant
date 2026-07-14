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

    const tasks = calls.map(
      async (call): Promise<ToolResult> => {
        const tool =
          toolRegistry[
            call.tool as keyof typeof toolRegistry
          ];

        if (!tool) {
          console.warn(
            `Unknown tool: ${call.tool}`
          );

          return {
            success: false,
            tool: call.tool,
            action: call.action,
            content: `Unknown tool "${call.tool}".`,
          };
        }

        try {
          return await tool.execute(
            call
          );
        } catch (error) {
          console.error(
            `[${call.tool}]`,
            error
          );

          return {
            success: false,
            tool: call.tool,
            action: call.action,
            content:
              error instanceof Error
                ? error.message
                : "Tool execution failed.",
          };
        }
      }
    );

    return Promise.all(tasks);
  }
}