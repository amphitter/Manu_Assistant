"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import FileIcon from "./FileIcon";
import { WorkspaceNode as Node } from "../services/workspace.service";
import { useWorkspaceStore } from "../store/workspace.store";

interface Props {
  node: Node;
}

export default function WorkspaceNode({ node }: Props) {
  const [expanded, setExpanded] = useState(false);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-zinc-300 transition-colors duration-150 hover:bg-zinc-900"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            // TODO: hook up active/selected file styling once the
            // workspace store exposes a selected/open path.
            openFile(node.path);
          }
        }}
      >
        {isFolder ? (
          <ChevronRight
            size={12}
            className={`shrink-0 text-zinc-600 transition-transform duration-150 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <FileIcon type={node.type} expanded={expanded} />
        <span className="truncate text-zinc-300 group-hover:text-zinc-100">
          {node.name}
        </span>
      </button>

      {expanded &&
        node.children?.map((child) => (
          <div
            key={child.path}
            className="ml-3 border-l border-zinc-800/60 pl-2"
          >
            <WorkspaceNode node={child} />
          </div>
        ))}
    </div>
  );
}