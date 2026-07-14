"use client";

import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

export default function SidebarFooter() {
  const tree = useWorkspaceStore((s) => s.tree);

  return (
    <div className="flex items-center gap-2 border-t border-zinc-800/80 px-4 py-3">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
      <p className="text-[11px] text-zinc-500">
        <span className="font-medium text-zinc-400">{tree.length}</span> root
        items
      </p>
    </div>
  );
}