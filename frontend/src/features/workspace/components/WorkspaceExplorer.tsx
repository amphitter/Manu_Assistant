"use client";

import { useEffect } from "react";

import WorkspaceNode from "./WorkspaceNode";

import { useWorkspaceStore } from "../store/workspace.store";

export default function WorkspaceExplorer() {
  const tree =
    useWorkspaceStore(
      (s) => s.tree
    );

  const loadTree =
    useWorkspaceStore(
      (s) => s.loadTree
    );

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="h-full overflow-y-auto p-2">

      {tree.map((node) => (
        <WorkspaceNode
          key={node.path}
          node={node}
        />
      ))}

    </div>
  );
}