export interface CodeSymbol {
  type:
    | "function"
    | "class"
    | "interface"
    | "type"
    | "variable";

  name: string;

  start: number;

  end: number;

  code: string;
}