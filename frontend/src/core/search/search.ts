import { getIndex } from "./cache";
import {
  rankResults,
  SearchResult,
} from "./ranking";

export class WorkspaceSearch {
  async search(
    query: string
  ): Promise<SearchResult[]> {
    const files = await getIndex();

    return rankResults(files, query);
  }
}

export const workspaceSearch =
  new WorkspaceSearch();