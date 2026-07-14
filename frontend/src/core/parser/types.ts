export type CodeSymbolType =
  | "function"
  | "method"
  | "constructor"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "component"
  | "variable";

export interface CodeSymbol {
  type: CodeSymbolType;

  name: string;

  start: number;

  end: number;

  code: string;
}