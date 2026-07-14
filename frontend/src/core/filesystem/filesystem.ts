import { WorkspaceNode } from "./types";

export interface FileSystemProvider {
  getTree(root?: string): Promise<WorkspaceNode[]>;

  readFile(path: string): Promise<string>;

  writeFile(
    path: string,
    content: string
  ): Promise<void>;

  createFile(
    path: string,
    content?: string
  ): Promise<void>;

  deleteFile(
    path: string
  ): Promise<void>;

  createDirectory(
    path: string
  ): Promise<void>;

  rename(
    oldPath: string,
    newPath: string
  ): Promise<void>;

  exists(
    path: string
  ): Promise<boolean>;
}