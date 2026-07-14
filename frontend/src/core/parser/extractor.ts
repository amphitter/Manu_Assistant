import { CodeSymbol } from "./types";

const MAX_LINES = 120;
const CONTEXT_BEFORE = 15;
const CONTEXT_AFTER = 25;
const MAX_HITS = 3;

export class ContextExtractor {
  extract(
    content: string,
    query: string,
    symbols: CodeSymbol[] = []
  ): string {
    const lower = query.trim().toLowerCase();

    if (!lower) {
      return content
        .split("\n")
        .slice(0, MAX_LINES)
        .join("\n");
    }

    // ----------------------------------
    // Exact symbol
    // ----------------------------------

    const exact = symbols.find(
      (symbol) =>
        symbol.name.toLowerCase() === lower
    );

    if (exact) {
      return exact.code;
    }

    // ----------------------------------
    // Partial symbol
    // ----------------------------------

    const partial = symbols.find(
      (symbol) =>
        symbol.name
          .toLowerCase()
          .includes(lower)
    );

    if (partial) {
      return partial.code;
    }

    // ----------------------------------
    // Keyword extraction
    // ----------------------------------

    const lines = content.split("\n");

    const snippets: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (
        !lines[i]
          .toLowerCase()
          .includes(lower)
      ) {
        continue;
      }

      const start = Math.max(
        0,
        i - CONTEXT_BEFORE
      );

      const end = Math.min(
        lines.length,
        i + CONTEXT_AFTER
      );

      snippets.push(
        lines
          .slice(start, end)
          .join("\n")
      );

      if (snippets.length >= MAX_HITS) {
        break;
      }
    }

    if (snippets.length) {
      return snippets.join(
        "\n\n====================\n\n"
      );
    }

    // ----------------------------------
    // Fallback
    // ----------------------------------

    return lines
      .slice(0, MAX_LINES)
      .join("\n");
  }
}

export const extractor =
  new ContextExtractor();