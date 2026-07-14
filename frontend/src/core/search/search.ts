import {
  getIndex,
  isIndexed,
} from "./cache";

import {
  rankResults,
  SearchResult,
} from "./ranking";

import { symbolIndex } from "./symbol-index";

export class WorkspaceSearch {
  async search(
    query: string
  ): Promise<SearchResult[]> {
    query = query.trim();

    if (!query) {
      return [];
    }

    console.time("Workspace Search");

    const files =
      await getIndex();

    // -----------------------------
    // Fast Symbol Lookup
    // -----------------------------
    const symbolFiles =
      symbolIndex.find(query);

    if (symbolFiles.length) {
      console.timeEnd(
        "Workspace Search"
      );

      console.log(
        `Symbol hit: ${query}`
      );

      return symbolFiles.map(
        (file) => ({
          ...file,
          score: 999999,
        })
      );
    }

    // -----------------------------
    // Fallback Ranking
    // -----------------------------
    const results =
      rankResults(
        files,
        query
      );

    console.timeEnd(
      "Workspace Search"
    );

    console.log(
      `Query: "${query}"`
    );

    console.log(
      `Indexed: ${isIndexed()}`
    );

    console.log(
      `Files: ${files.length}`
    );

    console.log(
      `Results: ${results.length}`
    );

    return results;
  }
}

export const workspaceSearch =
  new WorkspaceSearch();