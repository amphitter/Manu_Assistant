import {
  workspaceIndexer,
  IndexedFile,
} from "./indexer";

import { workspace } from "@/core/filesystem/workspace";

let cache: IndexedFile[] = [];

let indexed = false;

let building: Promise<
  IndexedFile[]
> | null = null;

// Track which workspace the cache belongs to
let indexedWorkspace = "";

export async function getIndex(): Promise<IndexedFile[]> {
  const currentWorkspace =
    workspace.getRoot();

  // Workspace changed -> invalidate automatically
  if (
    indexed &&
    indexedWorkspace !==
      currentWorkspace
  ) {
    invalidateIndex();
  }

  if (indexed) {
    return cache;
  }

  // Prevent concurrent rebuilds
  if (building) {
    return building;
  }

  console.time(
    "Workspace Index"
  );

  building = workspaceIndexer
    .build()
    .then((files) => {
      cache = files;

      indexed = true;

      indexedWorkspace =
        currentWorkspace;

      console.timeEnd(
        "Workspace Index"
      );

      console.log(
        `Workspace: ${indexedWorkspace}`
      );

      console.log(
        `Indexed ${files.length} files`
      );

      return cache;
    })
    .finally(() => {
      building = null;
    });

  return building;
}

export async function rebuildIndex() {
  invalidateIndex();

  return getIndex();
}

export function invalidateIndex() {
  cache = [];

  indexed = false;

  building = null;

  indexedWorkspace = "";

  console.log(
    "Workspace index invalidated."
  );
}

export function getCachedIndex(): IndexedFile[] {
  return cache;
}

export function isIndexed() {
  return indexed;
}

export function getIndexedWorkspace() {
  return indexedWorkspace;
}