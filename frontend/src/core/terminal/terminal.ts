import { TerminalProvider } from "./types";

export let terminal: TerminalProvider;

export function registerTerminal(
  provider: TerminalProvider
) {
  terminal = provider;
}