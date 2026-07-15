import { LocalTerminal } from "./local-terminal";
import { TerminalProvider } from "./types";

/**
 * Global singleton terminal instance.
 *
 * This removes the need for runtime registration and prevents:
 * "Cannot read properties of undefined (reading 'run')"
 */

export const terminal: TerminalProvider =
  new LocalTerminal();