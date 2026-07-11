import { create } from "zustand";

import {
  WorkspaceNode,
  workspaceService,
} from "../services/workspace.service";

interface WorkspaceStore {
  tree: WorkspaceNode[];

  selectedFile: string | null;

  fileContent: string;

  loadTree(): Promise<void>;

  openFile(path: string): Promise<void>;
}

export const useWorkspaceStore =
  create<WorkspaceStore>((set) => ({
    tree: [],

    selectedFile: null,

    fileContent: "",

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

    async openFile(path: string) {
      try {
        const content =
          await workspaceService.readFile(path);

        set({
          selectedFile: path,
          fileContent: content,
        });
      } catch (error) {
        console.error(error);
      }
    },
  }));