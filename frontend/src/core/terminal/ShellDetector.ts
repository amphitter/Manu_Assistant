import os from "os";

export interface ShellInfo {
  shell: string;

  executable: string;

  args: string[];
}

export class ShellDetector {
  detect(): ShellInfo {
    // Windows
    if (process.platform === "win32") {
      const comspec =
        process.env.ComSpec ??
        "C:\\Windows\\System32\\cmd.exe";

      if (
        comspec
          .toLowerCase()
          .includes("powershell")
      ) {
        return {
          shell: "powershell",

          executable: comspec,

          args: [
            "-NoLogo",
            "-NoProfile",
            "-Command",
          ],
        };
      }

      return {
        shell: "cmd",

        executable: comspec,

        args: ["/c"],
      };
    }

    // macOS / Linux

    const shell =
      process.env.SHELL ??
      "/bin/bash";

    return {
      shell: shell.split("/").pop() ?? "bash",

      executable: shell,

      args: ["-c"],
    };
  }

  getName(): string {
    return this.detect().shell;
  }

  getExecutable(): string {
    return this.detect().executable;
  }

  isWindows() {
    return process.platform === "win32";
  }

  isLinux() {
    return process.platform === "linux";
  }

  isMac() {
    return process.platform === "darwin";
  }

  platform() {
    return os.platform();
  }
}

export const shellDetector =
  new ShellDetector();
