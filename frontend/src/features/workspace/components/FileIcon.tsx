"use client";

import { File, Folder, FolderOpen } from "lucide-react";

interface Props {
  type: "file" | "folder";
  expanded?: boolean;
}

export default function FileIcon({ type, expanded = false }: Props) {
  if (type === "file") {
    return <File size={14} className="shrink-0 text-zinc-500" />;
  }

  return expanded ? (
    <FolderOpen size={14} className="shrink-0 text-amber-500/70" />
  ) : (
    <Folder size={14} className="shrink-0 text-amber-500/70" />
  );
}