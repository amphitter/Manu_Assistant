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
      },
      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/,
      },
      {
        type: "function",
        regex:
          /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?.*=>/,
      },
      {
        type: "class",
        regex:
          /(export\s+)?class\s+([A-Za-z0-9_]+)/,
      },
      {
        type: "interface",
        regex:
          /interface\s+([A-Za-z0-9_]+)/,
      },
      {
        type: "type",
        regex:
          /type\s+([A-Za-z0-9_]+)/,
      },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);

        if (!match) continue;

        const name =
          match[3] ??
          match[2] ??
          match[1];

        if (!name) continue;

        symbols.push({
          type: pattern.type as any,
          name,
          start: i,
          end: Math.min(lines.length - 1, i + 120),
          code: lines
            .slice(i, i + 120)
            .join("\n"),
        });

        break;
      }
    }

    return symbols;
  }
}

export const codeParser =
  new CodeParser();