import { NextRequest } from "next/server";

import { terminal } from "@/core/terminal/terminal";

function badRequest(message: string) {
  return Response.json(
    {
      success: false,
      error: message,
    },
    {
      status: 400,
    }
  );
}

function internalError(error: unknown) {
  console.error(error);

  return Response.json(
    {
      success: false,
      error: "Internal Server Error.",
    },
    {
      status: 500,
    }
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const action =
      body.action;

    switch (action) {
      // ----------------------------------------
      // RUN
      // ----------------------------------------

      case "run": {
        const command =
          body.command;

        if (
          typeof command !==
            "string" ||
          !command.trim()
        ) {
          return badRequest(
            "Missing command."
          );
        }

        const result =
          await terminal.run(
            command
          );

        return Response.json({
          success:
            result.success,

          processId:
            result.processId,

          command:
            result.command,

          stdout:
            result.stdout,

          stderr:
            result.stderr,

          exitCode:
            result.exitCode,

          duration:
            result.duration,
        });
      }

      // ----------------------------------------
      // STOP
      // ----------------------------------------

      case "stop": {
        const processId =
          body.processId;

        if (
          typeof processId !==
          "number"
        ) {
          return badRequest(
            "Missing processId."
          );
        }

        const stopped =
          await terminal.stop(
            processId
          );

        return Response.json({
          success: stopped,

          processId,

          message: stopped
            ? "Process stopped."
            : "Unable to stop process.",
        });
      }

      // ----------------------------------------
      // LIST
      // ----------------------------------------

      case "list": {
        const processes =
          await terminal.list();

        return Response.json({
          success: true,

          processes,
        });
      }

      // ----------------------------------------
      // LOGS
      // ----------------------------------------

      case "logs": {
        const processId =
          body.processId;

        if (
          typeof processId !==
          "number"
        ) {
          return badRequest(
            "Missing processId."
          );
        }

        const logs =
          await terminal.logs(
            processId
          );

        if (!logs) {
          return Response.json(
            {
              success: false,
              error:
                "Logs not found.",
            },
            {
              status: 404,
            }
          );
        }

        return Response.json({
          success: true,

          processId,

          stdout:
            logs.stdout,

          stderr:
            logs.stderr,
        });
      }

      // ----------------------------------------
      // UNKNOWN
      // ----------------------------------------

      default:
        return badRequest(
          "Unknown terminal action."
        );
    }
  } catch (error) {
    return internalError(
      error
    );
  }
}