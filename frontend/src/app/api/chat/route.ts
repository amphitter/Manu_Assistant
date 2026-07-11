import { NextRequest } from "next/server";
import { provider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { message, model } = await req.json();

    const response = await provider.chat({
      model: model ?? "qwen3:4b",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return Response.json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Failed to generate response",
      },
      {
        status: 500,
      }
    );
  }
}