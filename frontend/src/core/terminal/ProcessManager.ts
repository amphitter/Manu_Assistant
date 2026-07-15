import { ChildProcess } from "child_process";

import { terminalEvents } from "./TerminalEvents";

export interface ProcessInfo {
  id: number;

  command: string;

  cwd: string;

  process: ChildProcess;

  startedAt: number;

  status:
    | "running"
    | "finished"
    | "failed"
    | "killed";

  exitCode?: number | null;

  stdout: string;

  stderr: string;
}

export class ProcessManager {
  private nextId = 1;

  private readonly processes =
    new Map<number, ProcessInfo>();

  register(
    process: ChildProcess,
    command: string,
    cwd: string
  ): ProcessInfo {
    const info: ProcessInfo = {
      id: this.nextId++,

      command,

      cwd,

      process,

      startedAt: Date.now(),

      status: "running",

      stdout: "",

      stderr: "",
    };

    this.processes.set(
      info.id,
      info
    );

    // ----------------------------------
    // PROCESS START
    // ----------------------------------

    terminalEvents.emit({
      processId: info.id,
      type: "start",
      data: command,
      timestamp: Date.now(),
    });

    // ----------------------------------
    // STDOUT
    // ----------------------------------

    process.stdout?.on(
      "data",
      (chunk: Buffer | string) => {
        const text =
          chunk.toString();

        info.stdout += text;

        terminalEvents.emit({
          processId: info.id,
          type: "stdout",
          data: text,
          timestamp:
            Date.now(),
        });
      }
    );

    // ----------------------------------
    // STDERR
    // ----------------------------------

    process.stderr?.on(
      "data",
      (chunk: Buffer | string) => {
        const text =
          chunk.toString();

        info.stderr += text;

        terminalEvents.emit({
          processId: info.id,
          type: "stderr",
          data: text,
          timestamp:
            Date.now(),
        });
      }
    );

    // ----------------------------------
    // EXIT
    // ----------------------------------

    process.on(
      "exit",
      (code) => {
        info.exitCode = code;

        info.status =
          code === 0
            ? "finished"
            : "failed";

        terminalEvents.emit({
          processId: info.id,
          type: "exit",
          data: "",
          exitCode:
            code ?? 0,
          timestamp:
            Date.now(),
        });
      }
    );

    process.on(
      "error",
      (error) => {
        info.status =
          "failed";

        terminalEvents.emit({
          processId: info.id,
          type: "stderr",
          data:
            error.message,
          timestamp:
            Date.now(),
        });
      }
    );

    return info;
  }

  get(
    id: number
  ): ProcessInfo | undefined {
    return this.processes.get(
      id
    );
  }

  list(): ProcessInfo[] {
    return Array.from(
      this.processes.values()
    ).sort(
      (a, b) =>
        b.startedAt -
        a.startedAt
    );
  }

  isRunning(
    id: number
  ): boolean {
    return (
      this.get(id)
        ?.status ===
      "running"
    );
  }

  kill(
    id: number
  ): boolean {
    const info =
      this.get(id);

    if (
      !info ||
      info.status !==
        "running"
    ) {
      return false;
    }

    info.process.kill();

    info.status =
      "killed";

    terminalEvents.emit({
      processId: info.id,
      type: "exit",
      data: "Killed",
      exitCode: -1,
      timestamp:
        Date.now(),
    });

    return true;
  }

  remove(
    id: number
  ) {
    this.processes.delete(
      id
    );
  }

  clearFinished() {
    for (const [
      id,
      process,
    ] of this.processes) {
      if (
        process.status !==
        "running"
      ) {
        this.processes.delete(
          id
        );
      }
    }
  }

  getLogs(
    id: number
  ) {
    const info =
      this.get(id);

    if (!info) {
      return null;
    }

    return {
      stdout:
        info.stdout,

      stderr:
        info.stderr,
    };
  }
}

export const processManager =
  new ProcessManager();