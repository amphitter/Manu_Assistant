"use client";

import {
  Square,
  Play,
  RefreshCw,
} from "lucide-react";

import { useMemo } from "react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalProcess {
  processId: number;
  status: "running" | "finished";
  command: string;
  exitCode?: number;
}

interface TerminalProcessListProps {
  onSelect?(
    processId: number
  ): void;

  selectedProcess?: number;

  onKill?(
    processId: number
  ): void;

  onRestart?(
    processId: number
  ): void;
}

export default function TerminalProcessList({
  onSelect,
  selectedProcess,
  onKill,
  onRestart,
}: TerminalProcessListProps) {
  const events =
    useTerminalStore(
      (state) => state.events
    );

  const processes =
    useMemo(() => {
      const map =
        new Map<
          number,
          TerminalProcess
        >();

      for (const event of events) {
        if (
          !map.has(
            event.processId
          )
        ) {
          map.set(
            event.processId,
            {
              processId:
                event.processId,

              command: "",

              status:
                "running",
            }
          );
        }

        const process =
          map.get(
            event.processId
          )!;

        if (
          event.type ===
          "start"
        ) {
          process.command =
            event.data;
        }

        if (
          event.type ===
          "exit"
        ) {
          process.status =
            "finished";

          process.exitCode =
            event.exitCode;
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (
          a,
          b
        ) =>
          b.processId -
          a.processId
      );
    }, [events]);

  if (
    !processes.length
  ) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No running processes.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {processes.map(
        (process) => (
          <button
            key={
              process.processId
            }
            onClick={() =>
              onSelect?.(
                process.processId
              )
            }
            className={`flex items-center justify-between border-b border-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-900 ${
              selectedProcess ===
              process.processId
                ? "bg-zinc-900"
                : ""
            }`}
          >
            <div className="flex flex-col">
              <span className="font-mono text-xs text-zinc-300">
                {
                  process.command
                }
              </span>

              <span className="mt-1 text-[11px] text-zinc-500">
                PID #
                {
                  process.processId
                }
              </span>
            </div>

            <div className="flex items-center gap-3">
              {process.status ===
              "running" ? (
                <>
                  <div className="flex items-center gap-1 text-green-400">
                    <Play className="h-3.5 w-3.5 fill-current" />

                    <span className="text-xs">
                      Running
                    </span>
                  </div>

                  <button
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      onKill?.(
                        process.processId
                      );
                    }}
                    className="rounded p-1 hover:bg-red-500/10"
                  >
                    <Square className="h-4 w-4 text-red-400 fill-current" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`text-xs ${
                      process.exitCode ===
                      0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    Exit{" "}
                    {
                      process.exitCode
                    }
                  </span>

                  <button
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      onRestart?.(
                        process.processId
                      );
                    }}
                    className="rounded p-1 hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-4 w-4 text-zinc-400" />
                  </button>
                </>
              )}
            </div>
          </button>
        )
      )}
    </div>
  );
}