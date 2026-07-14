"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceDialogStore } from "../store/dialog.store";
import { useWorkspaceStore } from "../store/workspace.store";

export default function WorkspaceDialog() {
  const open = useWorkspaceDialogStore((s) => s.open);
  const hide = useWorkspaceDialogStore((s) => s.hide);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const recent = useWorkspaceStore((s) => s.recentWorkspaces);
  const loading = useWorkspaceStore((s) => s.loading);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  async function openWorkspace() {
    const value = path.trim();
    if (!value) {
      setError("Please enter a workspace path.");
      return;
    }
    try {
      setError("");
      await setWorkspace(value);
      setPath("");
      hide();
    } catch {
      setError("Unable to open workspace.");
    }
  }

  async function openRecent(value: string) {
    try {
      await setWorkspace(value);
      hide();
    } catch {}
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          hide();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium tracking-tight text-zinc-100">
            Open Workspace
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            Select the project you want MANU to work on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Current Workspace
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-300">
              {workspace ?? "No workspace selected"}
            </div>
          </div>

          {/* Path */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Workspace Path
            </p>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="C:\Projects\MyApp"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  openWorkspace();
                }
              }}
              className="border-zinc-800 bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <Button
            onClick={openWorkspace}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Opening..." : "Open Workspace"}
          </Button>

          {/* Recent */}
          {recent.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Recent Workspaces
              </p>
              <div className="space-y-1.5">
                {recent.map((item) => (
                  <button
                    key={item}
                    onClick={() => openRecent(item)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}