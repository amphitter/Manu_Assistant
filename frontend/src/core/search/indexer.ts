import fs from "fs/promises";
import path from "path";

import {
  IGNORE_FILES,
  IGNORE_FOLDERS,
} from "@/core/filesystem/ignore";

export interface IndexedFile {
  name: string;
  path: string;
  content: string;
}

export class WorkspaceIndexer {
  private readonly root: string;

  constructor() {
    this.root = path.resolve(
      process.env.WORKSPACE_ROOT || process.cwd()
    );
  }

  async build(): Promise<IndexedFile[]> {
    const files: IndexedFile[] = [];

    await this.walk(this.root, files);

    return files;
  }

  private async walk(
    directory: string,
    files: IndexedFile[]
  ) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORE_FOLDERS.has(entry.name)
      ) {
        continue;
      }

      if (
        entry.isFile() &&
        IGNORE_FILES.has(entry.name)
      ) {
        continue;
      }

      const absolute = path.join(
        directory,
        entry.name
      );

      if (entry.isDirectory()) {
        await this.walk(absolute, files);
        continue;
      }

      try {
        const content = await fs.readFile(
          absolute,
          "utf8"
        );

        files.push({
          name: entry.name,
          path: absolute,
          content,
        });
      } catch {}
    }
  }
}

export const workspaceIndexer =
  new WorkspaceIndexer();