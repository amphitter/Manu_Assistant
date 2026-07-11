"use client";

import { File, Folder, FolderOpen } from "lucide-react";

interface Props {
  type: "file" | "folder";
  expanded?: boolean;
}

export default function FileIcon({
  type,
  expanded = false,
}: Props) {
  if (type === "file") {
    return <File size={16} className="shrink-0" />;
  }

  return expanded ? (
    <FolderOpen size={16} className="shrink-0 text-yellow-400" />
  ) : (
    <Folder size={16} className="shrink-0 text-yellow-400" />
  );
}