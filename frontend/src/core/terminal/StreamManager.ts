import { terminalEvents } from "./TerminalEvents";

export interface ProcessStream {
  processId: number;

  stdout: string;

  stderr: string;

  startedAt: number;

  updatedAt: number;

  finished: boolean;

  exitCode?: number;
}


// Actual terminal event type
export interface StreamEvent {
  processId: number;

  type:
    | "start"
    | "stdout"
    | "stderr"
    | "exit";

  data: string;

  exitCode?: number;

  timestamp: number;
}

class StreamManager {
  private readonly streams =
    new Map<number, ProcessStream>();

  private readonly listeners =
    new Set<
      (event: StreamEvent) => void
    >();

  constructor() {
    terminalEvents.onTerminal(
      (event: StreamEvent) => {
        let stream =
          this.streams.get(
            event.processId
          );

        if (!stream) {
          stream = {
            processId:
              event.processId,

            stdout: "",

            stderr: "",

            startedAt:
              Date.now(),

            updatedAt:
              Date.now(),

            finished: false,
          };

          this.streams.set(
            event.processId,
            stream
          );
        }

        stream.updatedAt =
          Date.now();

        switch (event.type) {
          case "stdout":
            stream.stdout +=
              event.data;
            break;

          case "stderr":
            stream.stderr +=
              event.data;
            break;

          case "exit":
            stream.finished =
              true;

            stream.exitCode =
              event.exitCode;
            break;
        }

        // 🔥 Broadcast live
        for (const listener of this.listeners) {
          listener(event);
        }
      }
    );
  }

  subscribe(
    listener: (
      event: StreamEvent
    ) => void
  ) {
    this.listeners.add(
      listener
    );

    return () =>
      this.listeners.delete(
        listener
      );
  }

  get(
    processId: number
  ) {
    return this.streams.get(
      processId
    );
  }

  stdout(
    processId: number
  ) {
    return (
      this.streams.get(
        processId
      )?.stdout ?? ""
    );
  }

  stderr(
    processId: number
  ) {
    return (
      this.streams.get(
        processId
      )?.stderr ?? ""
    );
  }

  list() {
    return Array.from(
      this.streams.values()
    );
  }

  clear(
    processId: number
  ) {
    this.streams.delete(
      processId
    );
  }

  clearFinished() {
    for (const [
      id,
      stream,
    ] of this.streams) {
      if (stream.finished) {
        this.streams.delete(
          id
        );
      }
    }
  }

  clearAll() {
    this.streams.clear();
  }
}

export const streamManager =
  new StreamManager();