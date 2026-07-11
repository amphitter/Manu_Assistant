import fs from "fs/promises";
import path from "path";

import { FileSystemProvider } from "./filesystem";
import { WorkspaceNode } from "./types";
import { IGNORE_FILES, IGNORE_FOLDERS } from "./ignore";

export class LocalFileSystem implements FileSystemProvider {
  private readonly workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.resolve(
      process.env.WORKSPACE_ROOT || process.cwd()
    );
  }

  private validate(target: string): string {
    const resolved = path.resolve(target);

    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error("Access denied.");
    }

    return resolved;
  }

  async getTree(root?: string): Promise<WorkspaceNode[]> {
    const directory = this.validate(root || this.workspaceRoot);

    return this.walk(directory);
  }

  private async walk(directory: string): Promise<WorkspaceNode[]> {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    const nodes: WorkspaceNode[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE_FOLDERS.has(entry.name)) continue;
      } else {
        if (IGNORE_FILES.has(entry.name)) continue;
      }

      const absolute = path.join(directory, entry.name);

      const node: WorkspaceNode = {
        name: entry.name,
        path: absolute,
        type: entry.isDirectory() ? "folder" : "file",
      };

      if (entry.isDirectory()) {
        node.children = await this.walk(absolute);
      }

      nodes.push(node);
    }

    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }

      return a.type === "folder" ? -1 : 1;
    });

    return nodes;
  }

  async readFile(filePath: string): Promise<string> {
    const safe = this.validate(filePath);

    return fs.readFile(safe, "utf8");
  }
}

export const filesystem = new LocalFileSystem();