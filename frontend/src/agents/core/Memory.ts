import { AgentMessage } from "../types";

export class Memory {

  private messages: AgentMessage[] = [];

  add(message: AgentMessage) {
    this.messages.push(message);
  }

  all() {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
  }

}