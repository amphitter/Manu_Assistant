import { NextRequest, NextResponse } from "next/server";
import { filesystem } from "@/core/filesystem/local-filesystem";

export async function GET(req: NextRequest) {
  try {
    const filePath =
      req.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing path.",
        },
        {
          status: 400,
        }
      );
    }

    const content =
      await filesystem.readFile(filePath);

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to read file.",
      },
      {
        status: 500,
      }
    );
  }
}