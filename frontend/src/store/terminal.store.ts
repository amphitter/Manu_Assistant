// src/stores/terminal.store.ts

import { create } from "zustand";

export interface TerminalOutput {
  processId: number;

  type:
    | "stdout"
    | "stderr"
    | "start"
    | "exit";

  data: string;

  timestamp: number;

  exitCode?: number;
}

interface TerminalStore {
  events: TerminalOutput[];

  append(
    event: TerminalOutput
  ): void;

  clear(): void;

  clearProcess(
    processId: number
  ): void;
}

export const useTerminalStore =
  create<TerminalStore>(
    (set) => ({
      events: [],

      append(event) {
        set((state) => ({
          events: [
            ...state.events,
            event,
          ],
        }));
      },

      clear() {
        set({
          events: [],
        });
      },

      clearProcess(
        processId
      ) {
        set((state) => ({
          events:
            state.events.filter(
              (e) =>
                e.processId !==
                processId
            ),
        }));
      },
    })
  );