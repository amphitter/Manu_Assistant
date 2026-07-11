import { NextRequest } from "next/server";
import { provider } from "@/lib/ai";

export async function POST(req: NextRequest) {

  const { model, messages } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({

    async start(controller) {

      try {

        for await (const token of provider.stream({
          model,
          messages,
        })) {

          controller.enqueue(
            encoder.encode(token)
          );

        }

      } catch (err) {

        console.error(err);

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

}