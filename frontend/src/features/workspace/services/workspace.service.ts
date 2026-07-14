export interface WorkspaceNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: WorkspaceNode[];
}

class WorkspaceService {
  // -----------------------------
  // Workspace
  // -----------------------------

  async openWorkspace(
    path: string
  ): Promise<void> {
    const response = await fetch(
      "/api/workspace/open",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          path,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to open workspace."
      );
    }
  }

  async getCurrentWorkspace(): Promise<string | null> {
    const response = await fetch(
      "/api/workspace"
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.workspace ?? null;
  }

  // -----------------------------
  // Explorer
  // -----------------------------

  async getTree(): Promise<WorkspaceNode[]> {
    const response = await fetch(
      "/api/workspace/tree"
    );

    if (!response.ok) {
      throw new Error(
        "Failed to load workspace tree."
      );
    }

    const data =
      await response.json();

    return data.tree;
  }

  // -----------------------------
  // File Reader
  // -----------------------------

  async readFile(
    path: string
  ): Promise<string> {
    const response = await fetch(
      `/api/workspace/file?path=${encodeURIComponent(
        path
      )}`
    );

    if (!response.ok) {
      throw new Error(
        "Failed to read file."
      );
    }

    const data =
      await response.json();

    return data.content;
  }
}

export const workspaceService =
  new WorkspaceService();