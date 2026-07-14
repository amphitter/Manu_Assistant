import { IndexedFile } from "./indexer";

export interface SearchResult
  extends IndexedFile {
  score: number;
}

export function rankResults(
  files: IndexedFile[],
  query: string
): SearchResult[] {
  const q = query
    .trim()
    .toLowerCase();

  const tokens = q
    .split(/\s+/)
    .filter(Boolean);

  return files
    .map((file) => {
      let score = 0;

      const fileName =
        file.name.toLowerCase();

      const filePath =
        file.path.toLowerCase();

      const content =
        file.content.toLowerCase();

      // -----------------------------
      // Filename
      // -----------------------------

      if (fileName === q) {
        score += 2500;
      } else if (
        fileName.startsWith(q)
      ) {
        score += 1200;
      } else if (
        fileName.includes(q)
      ) {
        score += 700;
      }

      // -----------------------------
      // Symbols
      // -----------------------------

      for (const symbol of file.symbols) {
        const name =
          symbol.name.toLowerCase();

        if (name === q) {
          score += 5000;
          continue;
        }

        if (
          name.startsWith(q)
        ) {
          score += 2500;
          continue;
        }

        if (
          name.includes(q)
        ) {
          score += 1200;
        }
      }

      // -----------------------------
      // Path
      // -----------------------------

      if (
        filePath === q
      ) {
        score += 1500;
      } else if (
        filePath.includes(q)
      ) {
        score += 300;
      }

      // -----------------------------
      // Token scoring
      // -----------------------------

      for (const token of tokens) {
        if (
          fileName.includes(token)
        ) {
          score += 100;
        }

        if (
          filePath.includes(token)
        ) {
          score += 30;
        }

        if (
          content.includes(token)
        ) {
          score += 10;
        }
      }

      // -----------------------------
      // Extension boost
      // -----------------------------

      if (
        fileName.endsWith(".ts")
      )
        score += 20;

      if (
        fileName.endsWith(".tsx")
      )
        score += 15;

      // -----------------------------
      // Prefer shallow files
      // -----------------------------

      score -=
        filePath.split(/[\\/]/)
          .length * 2;

      return {
        ...file,
        score,
      };
    })
    .filter(
      (file) => file.score > 0
    )
    .sort((a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      return (
        a.path.length -
        b.path.length
      );
    });
}