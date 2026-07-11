import ollama from "ollama";

import { ToolCall } from "../types";
import { PLANNER_PROMPT } from "../prompts/planner.prompt";

export interface Plan {
  toolCalls: ToolCall[];
}

export class Planner {
  async plan(message: string): Promise<Plan> {
    const response = await ollama.chat({
      model: "qwen3:4b",
      stream: false,
      messages: [
        {
          role: "system",
          content: PLANNER_PROMPT,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    console.log("\n========== PLANNER ==========");
    console.log(response.message.content);
    console.log("=============================\n");

    try {
      return JSON.parse(response.message.content);
    } catch (error) {
      console.error("Planner JSON Error:", error);

      return {
        toolCalls: [],
      };
    }
  }
}