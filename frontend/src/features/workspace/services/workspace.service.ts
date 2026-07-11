export interface WorkspaceNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: WorkspaceNode[];
}

class WorkspaceService {
  async getTree(): Promise<WorkspaceNode[]> {
    const response = await fetch("/api/workspace/tree");

    if (!response.ok) {
      throw new Error("Failed to load workspace.");
    }

    const data = await response.json();

    return data.tree;
  }

  async readFile(path: string): Promise<string> {
    const response = await fetch(
      `/api/workspace/file?path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      throw new Error("Failed to read file.");
    }

    const data = await response.json();

    return data.content;
  }
}

export const workspaceService =
  new WorkspaceService();