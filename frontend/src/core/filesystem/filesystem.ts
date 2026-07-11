import { WorkspaceNode } from "./types";

export interface FileSystemProvider {
  getTree(root: string): Promise<WorkspaceNode[]>;

  readFile(path: string): Promise<string>;
}