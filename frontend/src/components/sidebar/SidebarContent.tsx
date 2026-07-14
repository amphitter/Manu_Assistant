"use client";

import { MessageSquare, Settings } from "lucide-react";
import WorkspaceExplorer from "@/features/workspace/components/WorkspaceExplorer";

export default function SidebarContent() {
  return (
    <div className="flex h-full flex-col px-2 py-3">
      <button className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400">
          <MessageSquare size={13} />
        </div>
        <span className="text-[13px] font-medium text-zinc-200">
          New Chat
        </span>
      </button>

      <div className="mt-4 flex-1 overflow-auto">
        <WorkspaceExplorer />
      </div>

      <button className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-zinc-900">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500">
          <Settings size={13} />
        </div>
        <span className="text-[13px] font-medium text-zinc-400">
          Settings
        </span>
      </button>
    </div>
  );
}