"use client";

import {
  useEffect,
  useRef,
} from "react";

import "xterm/css/xterm.css";

import { useTerminalStore } from "@/store/terminal.store";

interface XTermProps {
  processId?: number;
}

export default function XTerm({
  processId,
}: XTermProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const terminalRef =
    useRef<any>(null);

  const fitAddonRef =
    useRef<any>(null);

  const events =
    useTerminalStore(
      (state) => state.events
    );

  // ----------------------------------
  // Initialize Terminal (Client Only)
  // ----------------------------------

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      if (!containerRef.current) {
        return;
      }

      const [
        xterm,
        fitAddonModule,
      ] = await Promise.all([
        import("xterm"),
        import(
          "@xterm/addon-fit"
        ),
      ]);

      if (disposed) {
        return;
      }

      const Terminal =
        xterm.Terminal;

      const FitAddon =
        fitAddonModule.FitAddon;

      const terminal =
        new Terminal({
          cursorBlink: true,

          convertEol: true,

          scrollback: 5000,

          fontFamily:
            "JetBrains Mono, Consolas, monospace",

          fontSize: 14,

          allowTransparency: true,

          theme: {
            background:
              "#0d1117",

            foreground:
              "#e6edf3",

            cursor:
              "#58a6ff",

            selectionBackground:
              "#264f78",
          },
        });

      const fit =
        new FitAddon();

      terminal.loadAddon(
        fit
      );

      terminal.open(
        containerRef.current
      );

      fit.fit();

      terminalRef.current =
        terminal;

      fitAddonRef.current =
        fit;

      terminal.writeln(
        "\x1b[36mAGENTS Terminal v2\x1b[0m"
      );

      terminal.writeln("");

      const resize =
        () => fit.fit();

      window.addEventListener(
        "resize",
        resize
      );

      return () => {
        window.removeEventListener(
          "resize",
          resize
        );

        terminal.dispose();
      };
    }

    const cleanup =
      initialize();

    return () => {
      disposed = true;

      cleanup.then(
        (fn) => fn?.()
      );
    };
  }, []);

  // ----------------------------------
  // Render Events
  // ----------------------------------

  useEffect(() => {
    const terminal =
      terminalRef.current;

    if (!terminal) {
      return;
    }

    terminal.clear();

    terminal.writeln(
      "\x1b[36mAGENTS Terminal v2\x1b[0m"
    );

    terminal.writeln("");

    const filtered =
      events.filter(
        (event) =>
          processId
            ? event.processId ===
              processId
            : true
      );

    for (const event of filtered) {
      switch (
        event.type
      ) {
        case "start":
          terminal.writeln(
            `\x1b[36m$ ${event.data}\x1b[0m`
          );
          break;

        case "stdout":
          terminal.write(
            event.data
          );
          break;

        case "stderr":
          terminal.write(
            `\x1b[31m${event.data}\x1b[0m`
          );
          break;

        case "exit":
          if (
            event.exitCode ===
            0
          ) {
            terminal.writeln(
              "\n\x1b[32m✔ Process exited successfully.\x1b[0m"
            );
          } else {
            terminal.writeln(
              `\n\x1b[31m✖ Process exited (${event.exitCode}).\x1b[0m`
            );
          }
          break;
      }
    }

    fitAddonRef.current?.fit();
  }, [
    events,
    processId,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#0d1117]"
    />
  );
}