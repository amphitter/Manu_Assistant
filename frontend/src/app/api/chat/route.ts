import { NextRequest } from "next/server";

import { chatAgent } from "@/agents/core/ChatAgent";
import { codingAgent } from "@/agents/core/CodingAgent";

import { terminalEvents } from "@/core/terminal/TerminalEvents";

function isCodingRequest(
  message: string
) {
  const text =
    message.toLowerCase();

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

  return keywords.some((k) =>
    text.includes(k)
  );
}

function encodeEvent(
  encoder: TextEncoder,
  type:
    | "assistant"
    | "system"
    | "terminal",
  data: unknown
) {
  return encoder.encode(
    JSON.stringify({
      type,
      data,
    }) + "\n"
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
          error:
            "No message.",
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
          // --------------------------------
          // Forward Terminal Events
          // --------------------------------

          const unsubscribe =
            terminalEvents.onTerminal(
              (event) => {
                controller.enqueue(
                  encodeEvent(
                    encoder,
                    "terminal",
                    event
                  )
                );
              }
            );

          try {
            // --------------------------
            // Coding Agent
            // --------------------------

            if (
              isCodingRequest(
                last.content
              )
            ) {
              console.log(
                "\n========== ROUTER =========="
              );

              console.log(
                "Using CodingAgent"
              );

              console.log(
                "============================\n"
              );

              const result =
                await codingAgent.execute(
                  {
                    model,
                    messages,
                  }
                );

              controller.enqueue(
                encodeEvent(
                  encoder,
                  "assistant",
                  result
                )
              );

              return;
            }

            // --------------------------
            // Chat Agent
            // --------------------------

            console.log(
              "\n========== ROUTER =========="
            );

            console.log(
              "Using ChatAgent"
            );

            console.log(
              "============================\n"
            );

            for await (const token of chatAgent.chat(
              {
                model,
                messages,
              }
            )) {
              controller.enqueue(
                encodeEvent(
                  encoder,
                  "assistant",
                  token
                )
              );
            }
          } catch (error) {
            console.error(
              error
            );

            controller.enqueue(
              encodeEvent(
                encoder,
                "system",
                error instanceof Error
                  ? error.message
                  : "Internal Server Error."
              )
            );
          } finally {
            unsubscribe();

            controller.close();
          }
        },
      });

    return new Response(
      stream,
      {
        headers: {
          "Content-Type":
            "application/x-ndjson",

          "Cache-Control":
            "no-cache",

          Connection:
            "keep-alive",

          "X-Accel-Buffering":
            "no",
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