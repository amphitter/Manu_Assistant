import { NextResponse } from "next/server";

import { provider } from "@/lib/ai";

export async function GET() {
  const healthy = await provider.health();

  return NextResponse.json({
    success: healthy,
  });
}