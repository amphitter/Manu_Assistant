import { spawn, ChildProcess } from "child_process";

import { workspace } from "../filesystem/workspace";

import { processManager } from "./ProcessManager";

export interface TerminalSessionResult {
  id: number;

  process: ChildProcess;
}

export class TerminalSession {
  run(
    command: string,
    cwd = workspace.getRoot()
  ): TerminalSessionResult {
    const shell =
      process.platform === "win32"
        ? "cmd.exe"
        : "/bin/bash";

    const shellArgs =
      process.platform === "win32"
        ? ["/c", command]
        : ["-c", command];

    const child = spawn(shell, shellArgs, {
      cwd,
      env: process.env,
      windowsHide: true,

      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
    });

    const info =
      processManager.register(
        child,
        command,
        cwd
      );

    console.log(
      `\n[Terminal] Started PID ${info.id}`
    );

    console.log(
      `[Terminal] ${command}\n`
    );

    return {
      id: info.id,

      process: child,
    };
  }

  stop(id: number): boolean {
    return processManager.kill(id);
  }

  list() {
    return processManager.list();
  }

  logs(id: number) {
    return processManager.getLogs(id);
  }

  get(id: number) {
    return processManager.get(id);
  }
}

export const terminalSession =
  new TerminalSession();