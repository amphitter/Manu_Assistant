import { filesystem } from "@/core/filesystem/local-filesystem";
import { extractor } from "@/core/parser/extractor";

import { ToolResult } from "../types";

export class ContextBuilder {
  async build(
    toolResults: ToolResult[],
    userMessage: string
  ): Promise<string> {
    const sections: string[] = [];

    for (const result of toolResults) {
      if (!result.success) continue;

      switch (result.action) {
        case "tree": {
          sections.push(`
====================
PROJECT TREE
====================

${result.content}
`);
          break;
        }

        case "read": {
          const extracted = extractor.extract(
            result.content,
            userMessage
          );

          sections.push(`
====================
FILE CONTENT
====================

${extracted}
`);
          break;
        }

       case "search": {
  const searchResults = result.searchResults ?? [];

  if (!searchResults.length) break;

  for (const file of searchResults.slice(0, 5)) {
    try {
      const raw = await filesystem.readFile(file.path);

      const extracted = extractor.extract(
        raw,
        userMessage
      );

      sections.push(`
====================
FILE: ${file.path}
====================

${extracted}
`);
    } catch (error) {
      console.error(error);
    }
  }

  break;
}
      }
    }

    if (!sections.length) return "";

    return `
The following project context was retrieved from the workspace.

Base your answer ONLY on this context.

If something is not present here, explicitly say it is unavailable.

${sections.join("\n")}
`;
  }
}

export const contextBuilder =
  new ContextBuilder();