export interface HistoryEntry {
  id: number;

  command: string;

  cwd: string;

  startedAt: number;

  finishedAt?: number;

  exitCode?: number;
}

export class TerminalHistory {
  private history: HistoryEntry[] =
    [];

  add(
    entry: HistoryEntry
  ) {
    this.history.unshift(entry);

    if (
      this.history.length > 500
    ) {
      this.history.pop();
    }
  }

  finish(
    id: number,
    exitCode: number
  ) {
    const command =
      this.history.find(
        (item) => item.id === id
      );

    if (!command) {
      return;
    }

    command.exitCode =
      exitCode;

    command.finishedAt =
      Date.now();
  }

  all() {
    return [...this.history];
  }

  latest(
    count = 20
  ) {
    return this.history.slice(
      0,
      count
    );
  }

  clear() {
    this.history = [];
  }

  get(id: number) {
    return this.history.find(
      (item) => item.id === id
    );
  }
}

export const terminalHistory =
  new TerminalHistory();