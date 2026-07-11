import { filesystem } from "@/core/filesystem/local-filesystem";
import { workspaceSearch } from "@/core/search/search";

import {
  ToolCall,
  ToolResult,
} from "../types";

export class FilesystemTool {
  readonly name = "filesystem";

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    try {
      switch (call.action) {
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

        case "read": {
          if (!call.path) {
            return {
              success: false,
              tool: this.name,
              action: call.action,
              content: "Missing file path.",
            };
          }

          const content =
            await filesystem.readFile(
              call.path
            );

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content,
          };
        }

        case "search": {
          if (!call.query) {
            return {
              success: false,
              tool: this.name,
              action: call.action,
              content: "Missing search query.",
            };
          }

          const results =
  await workspaceSearch.search(
    call.query
  );

if (!results.length) {
  return {
    success: false,
    tool: this.name,
    action: call.action,
    content: "No matching files found.",
  };
}

return {
  success: true,
  tool: this.name,
  action: call.action,
  content: "",
  searchResults: results,
};

          const formatted = results
            .slice(0, 10)
            .map(
              (file, index) => `
${index + 1}. ${file.path}
Score: ${file.score}
`
            )
            .join("\n");

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content: formatted,
          };
        }

        default:
          return {
            success: false,
            tool: this.name,
            action: call.action,
            content:
              "Unknown filesystem action.",
          };
      }
    } catch (error) {
      console.error(error);

      return {
        success: false,
        tool: this.name,
        action: call.action,
        content:
          "Filesystem execution failed.",
      };
    }
  }
}

export const filesystemTool =
  new FilesystemTool();