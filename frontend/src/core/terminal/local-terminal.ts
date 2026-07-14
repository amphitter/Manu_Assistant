import { exec } from "child_process";
import { promisify } from "util";

import { workspace } from "../filesystem/workspace";

import {
  TerminalProvider,
  TerminalResult,
} from "./types";

const execute =
  promisify(exec);

export class LocalTerminal
  implements TerminalProvider
{
  async run(
    command: string
  ): Promise<TerminalResult> {
    const start = Date.now();

    try {
      const result =
        await execute(command, {
          cwd:
            workspace.getRoot(),

          windowsHide: true,

          maxBuffer:
            1024 *
            1024 *
            10,
        });

      return {
        success: true,

        command,

        stdout:
          result.stdout,

        stderr:
          result.stderr,

        exitCode: 0,

        duration:
          Date.now() -
          start,
      };
    } catch (error: any) {
      return {
        success: false,

        command,

        stdout:
          error.stdout ?? "",

        stderr:
          error.stderr ??
          error.message,

        exitCode:
          error.code ?? 1,

        duration:
          Date.now() -
          start,
      };
    }
  }
}