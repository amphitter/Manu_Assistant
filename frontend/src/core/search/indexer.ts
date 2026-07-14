import fs from "fs/promises";
import path from "path";

import {
  IGNORE_FILES,
  IGNORE_FOLDERS,
} from "@/core/filesystem/ignore";

import { workspace } from "@/core/filesystem/workspace";

import { codeParser } from "@/core/parser/parser";
import { CodeSymbol } from "@/core/parser/types";

import { symbolIndex } from "./symbol-index";

export interface IndexedFile {
  name: string;

  path: string;

  content: string;

  symbols: CodeSymbol[];

  modified: number;
}

export class WorkspaceIndexer {
  async build(): Promise<IndexedFile[]> {
    const files: IndexedFile[] = [];

    const root =
      workspace.getRoot();

    symbolIndex.clear();

    await this.walk(
      root,
      files
    );

    console.log(
      `Indexed ${files.length} files`
    );

    console.log(
      `Indexed ${symbolIndex.size()} symbols`
    );

    return files;
  }

  private async walk(
    directory: string,
    files: IndexedFile[]
  ) {
    const entries =
      await fs.readdir(directory, {
        withFileTypes: true,
      });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        IGNORE_FOLDERS.has(
          entry.name
        )
      ) {
        continue;
      }

      if (
        entry.isFile() &&
        IGNORE_FILES.has(
          entry.name
        )
      ) {
        continue;
      }

      const absolute =
        path.join(
          directory,
          entry.name
        );

      if (entry.isDirectory()) {
        await this.walk(
          absolute,
          files
        );

        continue;
      }

      try {
        const stat =
          await fs.stat(
            absolute
          );

        const content =
          await fs.readFile(
            absolute,
            "utf8"
          );

        const symbols =
          codeParser.parse(
            content
          );

        const file: IndexedFile = {
          name: entry.name,

          path: absolute,

          content,

          symbols,

          modified:
            stat.mtimeMs,
        };

        files.push(file);

        symbolIndex.add(file);
      } catch (error) {
        console.warn(
          "Skipped:",
          absolute,
          error
        );
      }
    }
  }
}

export const workspaceIndexer =
  new WorkspaceIndexer();