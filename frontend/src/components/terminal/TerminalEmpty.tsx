"use client";

import { Terminal } from "lucide-react";

interface TerminalEmptyProps {
  title?: string;

  description?: string;
}

export default function TerminalEmpty({
  title = "No Active Terminal",
  description = "Run a command or let the AI execute a task to start a terminal session.",
}: TerminalEmptyProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#0d1117] px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Terminal className="h-10 w-10 text-zinc-500" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-zinc-100">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>

      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3">
        <code className="font-mono text-sm text-zinc-400">
          npm run dev
        </code>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Press Enter to execute commands from the terminal input below.
      </p>
    </div>
  );
}