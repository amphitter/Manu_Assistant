import { CodeSymbol } from "./types";

export class CodeParser {
  parse(content: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    const lines = content.split("\n");

    const patterns = [
      {
        type: "function",
        regex:
          /(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)/,
        index: 3,
      },

      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/,
        index: 2,
      },

      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=.*=>/,
        index: 2,
      },

      {
        type: "class",
        regex:
          /(export\s+)?class\s+([A-Za-z0-9_]+)/,
        index: 2,
      },

      {
        type: "interface",
        regex:
          /interface\s+([A-Za-z0-9_]+)/,
        index: 1,
      },

      {
        type: "type",
        regex:
          /type\s+([A-Za-z0-9_]+)/,
        index: 1,
      },

      {
        type: "method",
        regex:
          /^\s*(public|private|protected)?\s*(static\s+)?(async\s+)?([A-Za-z0-9_]+)\s*\(/,
        index: 4,
      },

      {
        type: "method",
        regex:
          /^\s*(public|private|protected)?\s*async\s*\*\s*([A-Za-z0-9_]+)\s*\(/,
        index: 2,
      },

      {
        type: "constructor",
        regex:
          /^\s*constructor\s*\(/,
        index: -1,
      },
    ];

    const ignore = new Set([
      "if",
      "for",
      "while",
      "switch",
      "catch",
      "map",
      "filter",
      "reduce",
      "find",
      "some",
      "every",
      "set",
      "get",
      "return",
    ]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);

        if (!match) continue;

        const name =
          pattern.index === -1
            ? "constructor"
            : match[pattern.index];

        if (!name) continue;

        if (ignore.has(name)) {
          break;
        }

        let start = i;
        let end = i;

        let braces = 0;
        let started = false;

        for (let j = i; j < lines.length; j++) {
          const current = lines[j];

          for (const ch of current) {
            if (ch === "{") {
              braces++;
              started = true;
            }

            if (ch === "}") {
              braces--;
            }
          }

          if (started && braces === 0) {
            end = j;
            break;
          }
        }

        if (end <= start) {
          end = Math.min(
            lines.length - 1,
            start + 25
          );
        }

        symbols.push({
          type: pattern.type as any,
          name,
          start,
          end,
          code: lines
            .slice(start, end + 1)
            .join("\n"),
        });

        break;
      }
    }

    return symbols;
  }
}

export const codeParser = new CodeParser();