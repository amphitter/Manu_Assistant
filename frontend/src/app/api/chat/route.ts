import { NextRequest } from "next/server";

import { chatAgent } from "@/agents/core/ChatAgent";
import { codingAgent } from "@/agents/core/CodingAgent";

function isCodingRequest(message: string) {
  const text = message.toLowerCase();

  const keywords = [
    "create",
    "generate",
    "write",
    "edit",
    "modify",
    "update",
    "delete",
    "remove",
    "rename",
    "move",
    "fix",
    "bug",
    "error",
    "typescript",
    "compile",
    "build",
    "terminal",
    "npm",
    "pnpm",
    "yarn",
    "file",
    "folder",
    "component",
    "function",
    "class",
    "project",
    "workspace",
    "code",
    "refactor",
  ];

  return keywords.some((word) =>
    text.includes(word)
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const {
      model,
      messages,
    } = await req.json();

    const last =
      messages.at(-1);

    if (!last) {
      return Response.json(
        {
          success: false,
          error: "No message.",
        },
        {
          status: 400,
        }
      );
    }

    const encoder =
      new TextEncoder();

    const stream =
      new ReadableStream({
        async start(
          controller
        ) {
          try {
            // -------------------------
            // Coding Agent
            // -------------------------

            if (
              isCodingRequest(
                last.content
              )
            ) {
              console.log(
                "Using CodingAgent"
              );

              const result =
                await codingAgent.execute(
                  {
                    model,
                    messages,
                  }
                );

              controller.enqueue(
                encoder.encode(
                  result
                )
              );

              controller.close();

              return;
            }

            // -------------------------
            // Chat Agent
            // -------------------------

            console.log(
              "Using ChatAgent"
            );

            for await (const token of chatAgent.chat(
              {
                model,
                messages,
              }
            )) {
              controller.enqueue(
                encoder.encode(
                  token
                )
              );
            }
          } catch (error) {
            console.error(
              error
            );

            controller.enqueue(
              encoder.encode(
                "\n\n❌ Internal Server Error."
              )
            );
          } finally {
            controller.close();
          }
        },
      });

    return new Response(
      stream,
      {
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
          "Cache-Control":
            "no-cache",
          Connection:
            "keep-alive",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Invalid request.",
      },
      {
        status: 400,
      }
    );
  }
}