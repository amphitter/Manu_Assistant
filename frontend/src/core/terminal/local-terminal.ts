import { spawn } from "child_process";

import { workspace } from "../filesystem/workspace";

import { processManager } from "./ProcessManager";
import { terminalHistory } from "./TerminalHistory";
import { shellDetector } from "./ShellDetector";

import {
  TerminalProvider,
  TerminalResult,
  TerminalRunOptions,
} from "./types";

export class LocalTerminal
  implements TerminalProvider
{
  async run(
    command: string,
    options?: TerminalRunOptions
  ): Promise<TerminalResult> {
    const cwd =
      options?.cwd ??
      workspace.getRoot();

    const start = Date.now();

    const shell =
      shellDetector.detect();

    const child = spawn(
      shell.executable,
      [...shell.args, command],
      {
        cwd,
        env: {
          ...process.env,
          ...options?.env,
        },
        windowsHide: true,
      }
    );

    const processInfo =
      processManager.register(
        child,
        command,
        cwd
      );

    terminalHistory.add({
      id: processInfo.id,
      command,
      cwd,
      startedAt: Date.now(),
    });

    return new Promise(
      (resolve) => {
        child.on(
          "close",
          (code) => {
            const exitCode =
              code ?? 0;

            terminalHistory.finish(
              processInfo.id,
              exitCode
            );

            const logs =
              processManager.getLogs(
                processInfo.id
              );

            resolve({
              success:
                exitCode === 0,

              processId:
                processInfo.id,

              command,

              stdout:
                logs?.stdout ??
                "",

              stderr:
                logs?.stderr ??
                "",

              exitCode,

              duration:
                Date.now() -
                start,
            });
          }
        );
      }
    );
  }

  async stop(
    processId: number
  ): Promise<boolean> {
    return processManager.kill(
      processId
    );
  }

  async list() {
    return processManager.list();
  }

  async logs(
    processId: number
  ) {
    return processManager.getLogs(
      processId
    );
  }
}