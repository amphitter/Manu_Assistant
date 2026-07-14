import { extractor } from "@/core/parser/extractor";

import { ToolResult } from "../types";

const MAX_SEARCH_FILES = 5;

export class ContextBuilder {
  async build(
    toolResults: ToolResult[],
    userMessage: string
  ): Promise<string> {
    const sections: string[] = [];

    for (const result of toolResults) {
      if (!result.success) continue;

      switch (result.action) {
        //-----------------------------------
        // TREE
        //-----------------------------------

        case "tree": {
          sections.push(`
====================
PROJECT TREE
====================

${result.content}
`);
          break;
        }

        //-----------------------------------
        // READ
        //-----------------------------------

        case "read": {
          const extracted =
            extractor.extract(
              result.content,
              userMessage,
              result.symbols
            );

          sections.push(`
====================
FILE CONTENT
====================

${extracted}
`);
          break;
        }

        //-----------------------------------
        // SEARCH
        //-----------------------------------

        case "search": {
          const files =
            result.searchResults ?? [];

          if (!files.length) {
            break;
          }

          const query =
            result.query ??
            userMessage;

          for (const file of files.slice(0, MAX_SEARCH_FILES)) {
            const extracted =
              extractor.extract(
                file.content,
                query,
                file.symbols
              );

            sections.push(`
====================
FILE: ${file.path}
====================

${extracted}
`);
          }

          break;
        }
      }
    }

    if (!sections.length) {
      return "";
    }

    const context = `
The following project context was retrieved from the workspace.

Base your answer ONLY on this context.

Never say the context is unavailable if it exists below.

Answer ONLY using the supplied project context.

${sections.join("\n")}
`.trim();

    console.log("\n======= CONTEXT =======");
    console.log(
      "Sections:",
      sections.length
    );
    console.log(
      "Characters:",
      context.length
    );
    console.log("=======================\n");

    return context;
  }
}

export const contextBuilder =
  new ContextBuilder();