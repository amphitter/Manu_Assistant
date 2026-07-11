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