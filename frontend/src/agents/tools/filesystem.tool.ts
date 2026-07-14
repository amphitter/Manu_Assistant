import { filesystem } from "@/core/filesystem/local-filesystem";
import { invalidateIndex } from "@/core/search/cache";
import { workspaceSearch } from "@/core/search/search";

import {
  ToolCall,
  ToolResult,
  ToolAction,
} from "../types";

export class FilesystemTool {
  readonly name = "filesystem" as const;

  async execute(
    call: ToolCall
  ): Promise<ToolResult> {
    try {
      switch (call.action) {
        // ------------------------------------
        // TREE
        // ------------------------------------

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

        // ------------------------------------
        // READ
        // ------------------------------------

        case "read": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          const results =
            await workspaceSearch.search(
              call.path
            );

          const file =
            results.find(
              (f) =>
                f.path.endsWith(call.path!) ||
                f.name === call.path
            ) ?? results[0];

          if (!file) {
            return this.error(
              call.action,
              "File not found."
            );
          }

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content: file.content,
            symbols: file.symbols,
          };
        }

        // ------------------------------------
        // SEARCH
        // ------------------------------------

        case "search": {
          if (!call.query) {
            return this.error(
              call.action,
              "Missing search query."
            );
          }

          const results =
            await workspaceSearch.search(
              call.query
            );

          if (!results.length) {
            return this.error(
              call.action,
              "No matching files found."
            );
          }

          return {
            success: true,
            tool: this.name,
            action: call.action,
            query: call.query,
            searchResults: results.slice(
              0,
              10
            ),
            content: results
              .slice(0, 10)
              .map(
                (
                  file,
                  index
                ) => `${index + 1}. ${file.path}
Score: ${file.score}`
              )
              .join("\n"),
          };
        }

        // ------------------------------------
        // WRITE
        // ------------------------------------

        case "write": {
          if (
            !call.path ||
            call.content ===
              undefined
          ) {
            return this.error(
              call.action,
              "Missing path/content."
            );
          }

          await filesystem.writeFile(
            call.path,
            call.content
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "File written successfully.",
          };
        }

        // ------------------------------------
        // CREATE
        // ------------------------------------

        case "create": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          await filesystem.createFile(
            call.path,
            call.content ?? ""
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "File created successfully.",
          };
        }

        // ------------------------------------
        // DELETE
        // ------------------------------------

        case "delete": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing file path."
            );
          }

          await filesystem.deleteFile(
            call.path
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Deleted successfully.",
          };
        }

        // ------------------------------------
        // MKDIR
        // ------------------------------------

        case "mkdir": {
          if (!call.path) {
            return this.error(
              call.action,
              "Missing folder path."
            );
          }

          await filesystem.createDirectory(
            call.path
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Directory created successfully.",
          };
        }

        // ------------------------------------
        // RENAME
        // ------------------------------------

        case "rename": {
          if (
            !call.path ||
            !call.newPath
          ) {
            return this.error(
              call.action,
              "Missing rename paths."
            );
          }

          await filesystem.rename(
            call.path,
            call.newPath
          );

          invalidateIndex();

          return {
            success: true,
            tool: this.name,
            action: call.action,
            content:
              "Renamed successfully.",
          };
        }

        default: {
          return this.error(
            call.action,
            `Unsupported filesystem action "${call.action}".`
          );
        }
      }
    } catch (error) {
      console.error(error);

      return this.error(
        call.action,
        error instanceof Error
          ? error.message
          : "Filesystem execution failed."
      );
    }
  }

  private error(
    action: ToolAction,
    message: string
  ): ToolResult {
    return {
      success: false,
      tool: this.name,
      action,
      content: message,
    };
  }
}

export const filesystemTool =
  new FilesystemTool();