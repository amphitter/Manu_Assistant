import { NextResponse } from "next/server";
import ollama from "ollama";

export async function GET() {
  try {
    const models = await ollama.list();

    return NextResponse.json({
      success: true,
      models: models.models.map((model) => ({
        id: model.model,
        name: model.model,
        size: model.size,
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        models: [],
      },
      {
        status: 500,
      }
    );
  }
}