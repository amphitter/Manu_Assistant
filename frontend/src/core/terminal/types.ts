export interface TerminalResult {
  success: boolean;

  command: string;

  stdout: string;

  stderr: string;

  exitCode: number;

  duration: number;
}

export interface TerminalProvider {
  run(
    command: string
  ): Promise<TerminalResult>;
}