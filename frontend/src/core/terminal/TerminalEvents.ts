import { EventEmitter } from "events";

export interface TerminalEvent {
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

type TerminalListener = (
  event: TerminalEvent
) => void;

export class TerminalEvents {
  private readonly emitter =
    new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(
      100
    );
  }

  // ----------------------------------
  // Emit
  // ----------------------------------

  emit(
    event: TerminalEvent
  ) {
    this.emitter.emit(
      "terminal",
      event
    );

    this.emitter.emit(
      `process:${event.processId}`,
      event
    );
  }

  // ----------------------------------
  // Global Stream
  // ----------------------------------

  onTerminal(
    listener: TerminalListener
  ) {
    this.emitter.on(
      "terminal",
      listener
    );

    return () =>
      this.offTerminal(
        listener
      );
  }

  onceTerminal(
    listener: TerminalListener
  ) {
    this.emitter.once(
      "terminal",
      listener
    );
  }

  offTerminal(
    listener: TerminalListener
  ) {
    this.emitter.off(
      "terminal",
      listener
    );
  }

  // ----------------------------------
  // Process Stream
  // ----------------------------------

  onProcess(
    processId: number,
    listener: TerminalListener
  ) {
    const event =
      `process:${processId}`;

    this.emitter.on(
      event,
      listener
    );

    return () =>
      this.offProcess(
        processId,
        listener
      );
  }

  onceProcess(
    processId: number,
    listener: TerminalListener
  ) {
    this.emitter.once(
      `process:${processId}`,
      listener
    );
  }

  offProcess(
    processId: number,
    listener: TerminalListener
  ) {
    this.emitter.off(
      `process:${processId}`,
      listener
    );
  }

  // ----------------------------------
  // Utils
  // ----------------------------------

  listenerCount() {
    return this.emitter.listenerCount(
      "terminal"
    );
  }

  clearProcess(
    processId: number
  ) {
    this.emitter.removeAllListeners(
      `process:${processId}`
    );
  }

  clearAll() {
    this.emitter.removeAllListeners(
      "terminal"
    );
  }
}

export const terminalEvents =
  new TerminalEvents();