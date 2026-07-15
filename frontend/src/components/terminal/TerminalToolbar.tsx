"use client";

import {
  Trash2,
  Square,
  Copy,
  RotateCcw,
} from "lucide-react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalToolbarProps {
  running?: boolean;

  onKill?(): void;

  onRestart?(): void;
}

export default function TerminalToolbar({
  running = false,
  onKill,
  onRestart,
}: TerminalToolbarProps) {
  const clear =
    useTerminalStore(
      (state) => state.clear
    );

  async function copyOutput() {
    const events =
      useTerminalStore.getState().events;

    const text = events
      .map((event) => event.data)
      .join("");

    try {
      await navigator.clipboard.writeText(
        text
      );
    } catch {}
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3">
      <div className="flex items-center gap-2">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            running
              ? "bg-green-500"
              : "bg-zinc-500"
          }`}
        />

        <span className="text-xs font-medium text-zinc-300">
          {running
            ? "Running"
            : "Idle"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={copyOutput}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Copy Output"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={clear}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Clear"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={onRestart}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          disabled={!running}
          onClick={onKill}
          className="rounded-md p-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          title="Kill Process"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}