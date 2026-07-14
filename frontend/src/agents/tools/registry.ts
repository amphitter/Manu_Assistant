import { filesystemTool } from "./filesystem.tool";
import { terminalTool } from "./terminal.tools";
export const toolRegistry = {
  filesystem: filesystemTool,
  terminal: terminalTool,
};

export type ToolName =
  keyof typeof toolRegistry;