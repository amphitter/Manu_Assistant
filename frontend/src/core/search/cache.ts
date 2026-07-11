import {
  workspaceIndexer,
  IndexedFile,
} from "./indexer";

let cache: IndexedFile[] = [];
let indexed = false;

export async function getIndex(): Promise<IndexedFile[]> {
  if (!indexed) {
    cache = await workspaceIndexer.build();
    indexed = true;
  }

  return cache;
}

export function invalidateIndex() {
  indexed = false;
  cache = [];
}