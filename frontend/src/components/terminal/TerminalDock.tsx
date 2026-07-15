"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  AlertCircle,
  Bug,
  FileText,
  Terminal,
} from "lucide-react";

import { useTerminalStore } from "@/store/terminal.store";

import TerminalTabs from "./TerminalTabs";
import TerminalToolbar from "./TerminalToolbar";
import TerminalStatus from "./TerminalStatus";
import TerminalEmpty from "./TerminalEmpty";
import TerminalInput from "./TerminalInput";
import TerminalProcessList from "./TerminalProcessingList";

/**
 * IMPORTANT
 * xterm.js is browser-only.
 * Prevent SSR by dynamically importing it.
 */
const XTerm = dynamic(
  () => import("./XTerm"),
  {
    ssr: false,

    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0d1117] text-sm text-zinc-500">
        Initializing terminal...
      </div>
    ),
  }
);

type DockTab =
  | "terminal"
  | "output"
  | "problems"
  | "logs";

const TABS = [
  {
    id: "problems",
    label: "Problems",
    icon: AlertCircle,
  },
  {
    id: "output",
    label: "Output",
    icon: FileText,
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
  },
  {
    id: "logs",
    label: "Logs",
    icon: Bug,
  },
] as const;

export default function TerminalDock() {
  const [tab, setTab] =
    useState<DockTab>("terminal");

  const [
    selectedProcess,
    setSelectedProcess,
  ] = useState<number>();

  const events =
    useTerminalStore(
      (state) => state.events
    );

  async function executeCommand(
    command: string
  ) {
    try {
      await fetch(
        "/api/terminal/run",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            command,
          }),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function killProcess(
    processId: number
  ) {
    try {
      await fetch(
        "/api/terminal/stop",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            processId,
          }),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex h-80 w-full flex-col overflow-hidden border-t border-zinc-800 bg-zinc-950">
      {/* Header */}

      <div className="flex h-11 items-center justify-between border-b border-zinc-800">
        <TerminalTabs
          value={tab}
          onChange={(value) =>
            setTab(value)
          }
        />

        <TerminalToolbar />
      </div>

      {/* Body */}

      <div className="flex flex-1 overflow-hidden">
        {tab === "terminal" && (
          <>
            <div className="w-72 border-r border-zinc-800">
              <TerminalProcessList
                selectedProcess={
                  selectedProcess
                }
                onSelect={
                  setSelectedProcess
                }
                onKill={
                  killProcess
                }
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <TerminalStatus
                processId={
                  selectedProcess
                }
              />

              <div className="flex-1 overflow-hidden">
                {events.length ===
                0 ? (
                  <TerminalEmpty />
                ) : (
                  <XTerm
                    processId={
                      selectedProcess
                    }
                  />
                )}
              </div>

              <TerminalInput
                onExecute={
                  executeCommand
                }
              />
            </div>
          </>
        )}

        {tab === "output" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Output panel
          </div>
        )}

        {tab === "logs" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Logs panel
          </div>
        )}

        {tab === "problems" && (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            No problems found.
          </div>
        )}
      </div>

      {/* Footer */}

      <div className="flex h-8 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-500">
        <span>
          {events.length} event
          {events.length === 1
            ? ""
            : "s"}
        </span>

        <span>
          AGENTS Terminal
        </span>
      </div>
    </div>
  );
}