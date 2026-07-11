export type NodeType = "file" | "folder";

export interface WorkspaceNode {
  name: string;
  path: string;
  type: NodeType;
  children?: WorkspaceNode[];
}