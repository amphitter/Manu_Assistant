import { NextResponse } from "next/server";

import { workspace } from "@/core/filesystem/workspace";

export async function GET() {
  return NextResponse.json({
    workspace:
      workspace.getRoot(),
  });
}