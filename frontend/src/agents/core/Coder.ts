import ollama from "ollama";

import { CODER_PROMPT } from "../prompts/coder.prompt";
import { AgentMessage, ToolCall } from "../types";

const CODER_MODEL = "qwen2.5-coder:7b";

const MAX_RETRIES = 2;

const TIMEOUT = 60_000;

const VALID_ACTIONS = new Set([
  "tree",
  "read",
  "search",
  "write",
  "create",
  "delete",
  "rename",
  "mkdir",
]);

export interface CodePlan {
  message: string;

  toolCalls: ToolCall[];

  done: boolean;
}

export class Coder {
  async generate(
    messages: AgentMessage[]
  ): Promise<CodePlan> {
    console.time("coder");

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {
      try {
        const response = await Promise.race([
          ollama.chat({
            model: CODER_MODEL,

            stream: false,

            format: "json",

            options: {
              temperature: 0.1,
              num_predict: 4096,
            },

            messages: [
              {
                role: "system",
                content: CODER_PROMPT,
              },

              ...messages,
            ],
          }),

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Coder timeout."
                  )
                ),
              TIMEOUT
            )
          ),
        ]);

        let content =
          (response as any).message
            ?.content ?? "";

        console.log(
          "\n========== CODER =========="
        );

        console.log(content);

        console.log(
          "===========================\n"
        );

        content =
          this.clean(content);

        const plan =
          this.parse(content);

        console.timeEnd(
          "coder"
        );

        return plan;
      } catch (error) {
        console.error(
          `Coder Attempt ${attempt} Failed`
        );

        console.error(error);

        if (
          attempt === MAX_RETRIES
        ) {
          console.timeEnd(
            "coder"
          );

        return {
  message:
    "Failed to generate code plan.",

  toolCalls: [],

  done: true,
};
        }
      }
    }

    console.timeEnd(
      "coder"
    );

  return {
  message:
    "Failed to generate code plan.",

  toolCalls: [],

  done: true,
};
  }

  private clean(
    text: string
  ) {
    return text
      .replace(
        /```json/gi,
        ""
      )
      .replace(/```/g, "")
      .trim();
  }

 private parse(
  text: string
): CodePlan {
  if (
    !text ||
    text === "{}"
  ) {
    return {
      message: "",
      toolCalls: [],
      done: true,
    };
  }

  try {
    const parsed =
      JSON.parse(text);

    const toolCalls = Array.isArray(
      parsed.toolCalls
    )
      ? parsed.toolCalls.filter(
          (tool: ToolCall) =>
            tool.tool ===
              "filesystem" &&
            VALID_ACTIONS.has(
              tool.action
            )
        )
      : [];

    return {
      message:
        parsed.message ?? "",

      toolCalls,

      done:
        parsed.done ??
        toolCalls.length === 0,
    };
  } catch {
    return {
      message: text,
      toolCalls: [],
      done: true,
    };
  }
}
}

export const coder =
  new Coder();