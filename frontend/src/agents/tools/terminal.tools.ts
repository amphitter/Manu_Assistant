import { terminal } from "@/core/terminal/terminal";

import {
  ToolCall,
  ToolResult,
} from "../types";

export class TerminalTool {
  readonly name =
    "terminal";

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    if (!call.command) {
      return {
        success: false,

        tool: this.name,

        action:
          call.action,

        content:
          "Missing command.",
      };
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

      content: `
Command:
${result.command}

Exit Code:
${result.exitCode}

STDOUT:
${result.stdout}

STDERR:
${result.stderr}
`,
    };
  }
}

export const terminalTool =
  new TerminalTool();