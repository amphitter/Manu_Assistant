import { IndexedFile } from "./indexer";

export class SymbolIndex {
  private index = new Map<
    string,
    IndexedFile[]
  >();

  clear() {
    this.index.clear();
  }

  add(file: IndexedFile) {
    for (const symbol of file.symbols) {
      const key =
        symbol.name.toLowerCase();

      const existing =
        this.index.get(key) ??
        [];

      existing.push(file);

      this.index.set(
        key,
        existing
      );
    }
  }

  find(
    query: string
  ): IndexedFile[] {
    return (
      this.index.get(
        query.toLowerCase()
      ) ?? []
    );
  }

  has(
    query: string
  ) {
    return this.index.has(
      query.toLowerCase()
    );
  }

  size() {
    return this.index.size;
  }
}

export const symbolIndex =
  new SymbolIndex();