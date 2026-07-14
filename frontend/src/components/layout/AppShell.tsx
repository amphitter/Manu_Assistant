"use client";

import { useEffect } from "react";

import Sidebar from "../sidebar/Sidebar";
import MainLayout from "./MainLayout";

import WorkspaceDialog from "@/features/workspace/components/WorkspaceDialog";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

export default function AppShell() {
  const initialize = useWorkspaceStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <MainLayout />
      </div>

      <WorkspaceDialog />
    </>
  );
}