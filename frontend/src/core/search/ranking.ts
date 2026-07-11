import { IndexedFile } from "./indexer";

export interface SearchResult
  extends IndexedFile {
  score: number;
}

export function rankResults(
  files: IndexedFile[],
  query: string
): SearchResult[] {
  const q = query.toLowerCase();

  return files
    .map((file) => {
      let score = 0;

      if (
        file.name.toLowerCase().includes(q)
      )
        score += 100;

      if (
        file.path.toLowerCase().includes(q)
      )
        score += 50;

      if (
        file.content.toLowerCase().includes(q)
      )
        score += 10;

      return {
        ...file,
        score,
      };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
}