"use client";

import { FolderOpen } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";
import { useWorkspaceDialogStore } from "@/features/workspace/store/dialog.store";

export default function SidebarHeader() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const show = useWorkspaceDialogStore((s) => s.show);

  return (
    <div className="border-b border-zinc-800/80 p-4">
      <h1 className="text-lg font-light italic tracking-tight text-zinc-200">
        Manu
      </h1>

      <button
        onClick={show}
        className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-900"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400">
            <FolderOpen size={13} />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </span>
        </div>
        <p className="mt-2 truncate pl-[2px] text-[13px] text-zinc-300">
          {workspace ?? "No workspace selected"}
        </p>
      </button>
    </div>
  );
}