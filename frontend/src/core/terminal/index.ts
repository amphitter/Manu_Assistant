import {
  registerTerminal,
} from "./terminal";

import { LocalTerminal } from "./local-terminal";

registerTerminal(
  new LocalTerminal()
);