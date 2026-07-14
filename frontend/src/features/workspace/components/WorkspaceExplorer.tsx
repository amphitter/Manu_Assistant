"use client";

import { useEffect } from "react";
import WorkspaceNode from "./WorkspaceNode";
import { useWorkspaceStore } from "../store/workspace.store";

export default function WorkspaceExplorer() {
  const tree = useWorkspaceStore((s) => s.tree);
  const loadTree = useWorkspaceStore((s) => s.loadTree);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  if (tree.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[12px] text-zinc-600">No files to show</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-2 py-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.700)_transparent]">
      {tree.map((node) => (
        <WorkspaceNode key={node.path} node={node} />
      ))}
    </div>
  );
}