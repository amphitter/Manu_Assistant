"use client";

import { useState } from "react";

import FileIcon from "./FileIcon";

import {
  WorkspaceNode as Node,
} from "../services/workspace.service";

import { useWorkspaceStore } from "../store/workspace.store";

interface Props {
  node: Node;
}

export default function WorkspaceNode({
  node,
}: Props) {
  const [expanded, setExpanded] =
    useState(false);

  const openFile =
    useWorkspaceStore(
      (s) => s.openFile
    );

  const isFolder =
    node.type === "folder";

  return (
    <div>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-zinc-800"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            openFile(node.path);
          }
        }}
      >
        <FileIcon
          type={node.type}
          expanded={expanded}
        />

        <span className="truncate">
          {node.name}
        </span>

      </button>

      {expanded &&
        node.children?.map((child) => (
          <div
            key={child.path}
            className="ml-5"
          >
            <WorkspaceNode
              node={child}
            />
          </div>
        ))}
    </div>
  );
}