"use client";

import { useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MessageSquare,
  Settings,
} from "lucide-react";

import WorkspaceExplorer from "@/features/workspace/components/WorkspaceExplorer";

export default function SidebarContent() {
  const [workspaceOpen, setWorkspaceOpen] =
    useState(true);

  return (
    <div className="flex h-full flex-col">

      {/* New Chat */}

      <button className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800">
        <MessageSquare size={18} />
        <span>New Chat</span>
      </button>

      {/* Workspace */}

      <button
        onClick={() =>
          setWorkspaceOpen(!workspaceOpen)
        }
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-3 transition hover:bg-zinc-800"
      >
        {workspaceOpen ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}

        <FolderOpen size={18} />

        <span>Workspace</span>
      </button>

      {workspaceOpen && (
        <div className="ml-3 mt-2">
          <WorkspaceExplorer />
        </div>
      )}

      {/* Settings */}

      <button className="mt-auto flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800">
        <Settings size={18} />
        <span>Settings</span>
      </button>
    </div>
  );
}