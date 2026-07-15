"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
} from "lucide-react";

import { useMemo } from "react";

import { useTerminalStore } from "@/store/terminal.store";

interface TerminalStatusProps {
  processId?: number;
}

export default function TerminalStatus({
  processId,
}: TerminalStatusProps) {
  const events =
    useTerminalStore(
      (state) => state.events
    );

  const status =
    useMemo(() => {
      const filtered =
        events.filter((event) =>
          processId
            ? event.processId ===
              processId
            : true
        );

      if (!filtered.length) {
        return {
          state: "idle",
          text: "Idle",
          color:
            "text-zinc-400",
          icon: Clock3,
        };
      }

      const last =
        filtered[
          filtered.length - 1
        ];

      if (
        last.type === "start"
      ) {
        return {
          state:
            "running",

          text:
            "Running",

          color:
            "text-blue-400",

          icon:
            Loader2,
        };
      }

      if (
        last.type === "exit"
      ) {
        if (
          (last.exitCode ??
            0) === 0
        ) {
          return {
            state:
              "success",

            text:
              "Completed",

            color:
              "text-green-400",

            icon:
              CheckCircle2,
          };
        }

        return {
          state:
            "failed",

          text:
            "Failed",

          color:
            "text-red-400",

          icon:
            XCircle,
        };
      }

      return {
        state:
          "running",

        text:
          "Running",

        color:
          "text-blue-400",

        icon:
          Loader2,
      };
    }, [
      events,
      processId,
    ]);

  const Icon =
    status.icon;

  return (
    <div className="flex h-10 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${status.color} ${
            status.state ===
            "running"
              ? "animate-spin"
              : ""
          }`}
        />

        <span
          className={`text-sm font-medium ${status.color}`}
        >
          {status.text}
        </span>
      </div>

      <div className="text-xs text-zinc-500">
        {processId
          ? `PID ${processId}`
          : "No Process"}
      </div>
    </div>
  );
}