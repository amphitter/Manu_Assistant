import { filesystemTool } from "./filesystem.tool";

export const toolRegistry = {
  filesystem: filesystemTool,
};

export type ToolName =
  keyof typeof toolRegistry;