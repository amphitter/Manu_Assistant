"use client";

import {
  AlertCircle,
  Bug,
  FileText,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type TerminalTab =
  | "problems"
  | "output"
  | "terminal"
  | "logs";

interface TerminalTabsProps {
  value: TerminalTab;

  onChange(
    tab: TerminalTab
  ): void;

  problemsCount?: number;

  outputCount?: number;

  terminalCount?: number;

  logsCount?: number;
}

const tabs = [
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

export default function TerminalTabs({
  value,
  onChange,
  problemsCount = 0,
  outputCount = 0,
  terminalCount = 0,
  logsCount = 0,
}: TerminalTabsProps) {
  function badge(
    id: TerminalTab
  ) {
    switch (id) {
      case "problems":
        return problemsCount;

      case "output":
        return outputCount;

      case "terminal":
        return terminalCount;

      case "logs":
        return logsCount;

      default:
        return 0;
    }
  }

  return (
    <div className="flex h-10 items-center border-b border-zinc-800 bg-zinc-900">
      {tabs.map(
        ({
          id,
          label,
          icon: Icon,
        }) => {
          const active =
            value === id;

          const count =
            badge(id);

          return (
            <button
              key={id}
              onClick={() =>
                onChange(id)
              }
              className={cn(
                "group flex h-full items-center gap-2 border-b-2 px-4 text-sm transition-all",

                active
                  ? "border-blue-500 bg-zinc-950 text-white"
                  : "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />

              <span>
                {label}
              </span>

              {count >
                0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",

                    active
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-700 text-zinc-200"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}