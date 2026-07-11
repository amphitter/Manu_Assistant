import { codeParser } from "./parser";

export class ContextExtractor {
  extract(
    content: string,
    query: string
  ) {
    const symbols =
      codeParser.parse(content);

    const lower =
      query.toLowerCase();

    for (const symbol of symbols) {
      if (
        symbol.name
          .toLowerCase()
          .includes(lower)
      ) {
        return symbol.code;
      }
    }

    return content;
  }
}

export const extractor =
  new ContextExtractor();