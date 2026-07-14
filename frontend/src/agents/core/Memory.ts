import { AgentMessage } from "../types";

const MAX_MESSAGES = 8;

const MAX_CHARACTERS = 8000;

export class Memory {
  private messages: AgentMessage[] = [];

  add(message: AgentMessage) {
    this.messages.push(message);

    this.trim();
  }

  all(): AgentMessage[] {
    return [...this.messages];
  }

  recent(count = MAX_MESSAGES): AgentMessage[] {
    return this.messages.slice(-count);
  }

  clear() {
    this.messages = [];
  }

  size() {
    return this.messages.length;
  }

  private trim() {
    // Keep recent messages
    if (this.messages.length > MAX_MESSAGES) {
      this.messages =
        this.messages.slice(-MAX_MESSAGES);
    }

    // Keep prompt under character budget
    while (
      this.totalCharacters() >
        MAX_CHARACTERS &&
      this.messages.length > 1
    ) {
      this.messages.shift();
    }
  }

  private totalCharacters(): number {
    return this.messages.reduce(
      (sum, message) =>
        sum + message.content.length,
      0
    );
  }
}