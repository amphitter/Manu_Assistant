import { NextRequest } from "next/server";
import { agent } from "@/agents/core/Agent";

export async function POST(req: NextRequest) {
  try {
    const { model, messages } = await req.json();

    console.log("Using Model:", model);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of agent.chat({
            model,
            messages,
          })) {
            controller.enqueue(
              encoder.encode(token)
            );
          }
        } catch (error) {
          console.error("Streaming Error:", error);

          controller.enqueue(
            encoder.encode(
              "\n\n❌ Internal server error."
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Request Error:", error);

    return Response.json(
      {
        success: false,
        error: "Invalid request.",
      },
      {
        status: 400,
      }
    );
  }
}