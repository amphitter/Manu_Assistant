import { create } from "zustand";

interface WorkspaceDialogStore {
  open: boolean;

  show(): void;

  hide(): void;

  toggle(): void;
}

export const useWorkspaceDialogStore =
  create<WorkspaceDialogStore>((set) => ({
    open: false,

    show() {
      set({
        open: true,
      });
    },

    hide() {
      set({
        open: false,
      });
    },

    toggle() {
      set((state) => ({
        open: !state.open,
      }));
    },
  }));