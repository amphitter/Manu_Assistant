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