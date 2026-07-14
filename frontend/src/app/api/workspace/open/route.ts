import {
  NextRequest,
  NextResponse,
} from "next/server";

import fs from "fs/promises";

import { workspace } from "@/core/filesystem/workspace";
import { invalidateIndex } from "@/core/search/cache";

export async function POST(
  req: NextRequest
) {
  try {
    const { path } =
      await req.json();

    if (
      typeof path !== "string" ||
      !path.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Workspace path is required.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const stat =
        await fs.stat(path);

      if (!stat.isDirectory()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Selected path is not a directory.",
          },
          {
            status: 400,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Workspace directory does not exist.",
        },
        {
          status: 404,
        }
      );
    }

    workspace.setRoot(path);

    invalidateIndex();

    console.log(
      "Workspace Changed:",
      path
    );

    return NextResponse.json({
      success: true,
      workspace: path,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to open workspace.",
      },
      {
        status: 500,
      }
    );
  }
}