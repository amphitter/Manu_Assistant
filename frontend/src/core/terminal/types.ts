export type ProcessStatus =
  | "running"
  | "finished"
  | "failed"
  | "killed";

export interface TerminalRunOptions {
  cwd?: string;

  env?: NodeJS.ProcessEnv;

  timeout?: number;

  background?: boolean;
}

export interface TerminalProcess {
  id: number;

  command: string;

  cwd: string;

  status: ProcessStatus;

  startedAt: number;

  exitCode?: number | null;

  stdout: string;

  stderr: string;
}

export interface TerminalStreamChunk {
  processId: number;

  type:
    | "stdout"
    | "stderr";

  data: string;
}

export interface TerminalResult {
  success: boolean;

  processId?: number;

  command: string;

  stdout: string;

  stderr: string;

  exitCode: number;

  duration: number;
}

export interface TerminalProvider {
  run(
    command: string,
    options?: TerminalRunOptions
  ): Promise<TerminalResult>;

  stop(
    processId: number
  ): Promise<boolean>;

  list(): Promise<
    TerminalProcess[]
  >;

  logs(
    processId: number
  ): Promise<{
    stdout: string;
    stderr: string;
  } | null>;
}