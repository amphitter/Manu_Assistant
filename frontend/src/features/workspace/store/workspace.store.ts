import { create } from "zustand";

import {
  WorkspaceNode,
  workspaceService,
} from "../services/workspace.service";

interface WorkspaceStore {
  // Workspace

  workspace: string | null;

  recentWorkspaces: string[];

  // Explorer

  tree: WorkspaceNode[];

  // Editor

  selectedFile: string | null;

  fileContent: string;

  loading: boolean;

  // Actions

  initialize(): Promise<void>;

  setWorkspace(
    path: string
  ): Promise<void>;

  loadTree(): Promise<void>;

  openFile(
    path: string
  ): Promise<void>;

  clearWorkspace(): void;
}

export const useWorkspaceStore =
  create<WorkspaceStore>((set, get) => ({
    workspace: null,

    recentWorkspaces: [],

    tree: [],

    selectedFile: null,

    fileContent: "",

    loading: false,

    async initialize() {
      if (typeof window === "undefined") {
        return;
      }

      const workspace =
        localStorage.getItem(
          "workspace"
        );

      const recent = JSON.parse(
        localStorage.getItem(
          "recent-workspaces"
        ) ?? "[]"
      );

      set({
        workspace,
        recentWorkspaces: recent,
      });

      if (workspace) {
        await get().loadTree();
      }
    },

    async setWorkspace(path) {
      try {
        set({
          loading: true,
        });

        await workspaceService.openWorkspace(
          path
        );

        const recent = [
          path,
          ...get().recentWorkspaces.filter(
            (p) => p !== path
          ),
        ].slice(0, 10);

        localStorage.setItem(
          "workspace",
          path
        );

        localStorage.setItem(
          "recent-workspaces",
          JSON.stringify(recent)
        );

        set({
          workspace: path,
          recentWorkspaces: recent,
        });

        await get().loadTree();
      } catch (error) {
        console.error(error);
      } finally {
        set({
          loading: false,
        });
      }
    },

    async loadTree() {
      try {
        const tree =
          await workspaceService.getTree();

        set({
          tree,
        });
      } catch (error) {
        console.error(error);
      }
    },

    async openFile(path) {
      try {
        set({
          loading: true,
        });

        const content =
          await workspaceService.readFile(
            path
          );

        set({
          selectedFile: path,
          fileContent: content,
        });
      } catch (error) {
        console.error(error);
      } finally {
        set({
          loading: false,
        });
      }
    },

    clearWorkspace() {
      if (typeof window !== "undefined") {
        localStorage.removeItem(
          "workspace"
        );

        localStorage.removeItem(
          "recent-workspaces"
        );
      }

      set({
        workspace: null,
        recentWorkspaces: [],
        tree: [],
        selectedFile: null,
        fileContent: "",
      });
    },
  }));