import fs from "fs/promises";
import path from "path";

import { FileSystemProvider } from "./filesystem";
import { WorkspaceNode } from "./types";
import {
  IGNORE_FILES,
  IGNORE_FOLDERS,
} from "./ignore";
import { workspace } from "./workspace";

export class LocalFileSystem
  implements FileSystemProvider
{
  private validate(target: string): string {
  const root = path.resolve(
    workspace.getRoot()
  );

  // Relative paths should be inside workspace
  const resolved = path.isAbsolute(target)
    ? path.resolve(target)
    : path.resolve(root, target);

  // Windows-safe comparison
  const normalizedRoot =
    path.normalize(root).toLowerCase();

  const normalizedResolved =
    path.normalize(resolved).toLowerCase();

  if (
    normalizedResolved !== normalizedRoot &&
    !normalizedResolved.startsWith(
      normalizedRoot + path.sep
    )
  ) {
    throw new Error(
      `Access denied.\nWorkspace: ${root}\nTarget: ${resolved}`
    );
  }

  return resolved;
}

  async getTree(
    root?: string
  ): Promise<WorkspaceNode[]> {
    const workspaceRoot =
      workspace.getRoot();

    const directory =
      this.validate(
        root ?? workspaceRoot
      );

    return this.walk(directory);
  }

  private async walk(
    directory: string
  ): Promise<WorkspaceNode[]> {
    const entries =
      await fs.readdir(directory, {
        withFileTypes: true,
      });

    const nodes: WorkspaceNode[] = [];

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

      const node: WorkspaceNode = {
        name: entry.name,
        path: absolute,
        type: entry.isDirectory()
          ? "folder"
          : "file",
      };

      if (entry.isDirectory()) {
        node.children =
          await this.walk(
            absolute
          );
      }

      nodes.push(node);
    }

    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(
          b.name
        );
      }

      return a.type === "folder"
        ? -1
        : 1;
    });

    return nodes;
  }

  async readFile(
    filePath: string
  ): Promise<string> {
    const safe =
      this.validate(filePath);

    return fs.readFile(
      safe,
      "utf8"
    );
  }

  async writeFile(
    filePath: string,
    content: string
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.writeFile(
      safe,
      content,
      "utf8"
    );
  }

  async createFile(
    filePath: string,
    content = ""
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.mkdir(
      path.dirname(safe),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      safe,
      content,
      "utf8"
    );
  }

  async deleteFile(
    filePath: string
  ): Promise<void> {
    const safe =
      this.validate(filePath);

    await fs.rm(safe, {
      recursive: true,
      force: true,
    });
  }

  async createDirectory(
    directory: string
  ): Promise<void> {
    const safe =
      this.validate(directory);

    await fs.mkdir(safe, {
      recursive: true,
    });
  }

  async rename(
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const from =
      this.validate(oldPath);

    const to =
      this.validate(newPath);

    await fs.rename(
      from,
      to
    );
  }

  async exists(
    target: string
  ): Promise<boolean> {
    try {
      await fs.access(
        this.validate(target)
      );

      return true;
    } catch {
      return false;
    }
  }
}

export const filesystem =
  new LocalFileSystem();