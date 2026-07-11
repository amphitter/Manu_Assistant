import { NextResponse } from "next/server";
import { filesystem } from "@/core/filesystem/local-filesystem";

export async function GET() {
  try {
    const tree = await filesystem.getTree();

    return NextResponse.json({
      success: true,
      tree,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        tree: [],
      },
      {
        status: 500,
      }
    );
  }
}