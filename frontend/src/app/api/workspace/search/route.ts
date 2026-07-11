import {
  NextRequest,
  NextResponse,
} from "next/server";

import { workspaceSearch } from "@/core/search/search";

export async function GET(
  req: NextRequest
) {
  try {
    const query =
      req.nextUrl.searchParams.get(
        "query"
      );

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          results: [],
        },
        {
          status: 400,
        }
      );
    }

    const results =
      await workspaceSearch.search(query);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        results: [],
      },
      {
        status: 500,
      }
    );
  }
}