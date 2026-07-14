import ollama from "ollama";

import {
  ToolCall,
  ToolAction,
} from "../types";

import { PLANNER_PROMPT } from "../prompts/planner.prompt";

export interface Plan {
  toolCalls: ToolCall[];
}

const PLANNER_MODEL = "qwen2.5-coder:7b";

const MAX_RETRIES = 2;

const TIMEOUT = 30_000;

const VALID_TOOLS = new Set([
  "filesystem",
  "terminal",
]);

const VALID_ACTIONS = new Set<ToolAction>([
  "tree",
  "read",
  "search",
  "write",
  "create",
  "delete",
  "rename",
  "mkdir",
  "run",
]);

export class Planner {
  async plan(
    message: string
  ): Promise<Plan> {
    console.time("planner");

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {
      try {
        const response = await Promise.race([
          ollama.chat({
            model: PLANNER_MODEL,

            stream: false,

            format: "json",

            options: {
              temperature: 0,
              num_predict: 256,
            },

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
          }),

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Planner timeout."
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
          "\n========== PLANNER =========="
        );
        console.log(content);
        console.log(
          "=============================\n"
        );

        content = this.clean(content);

        const plan =
          this.parse(content);

        console.timeEnd(
          "planner"
        );

        return plan;
      } catch (error) {
        console.error(
          `Planner Attempt ${attempt} Failed`
        );

        console.error(error);

        if (
          attempt === MAX_RETRIES
        ) {
          console.timeEnd(
            "planner"
          );

          return {
            toolCalls: [],
          };
        }
      }
    }

    console.timeEnd(
      "planner"
    );

    return {
      toolCalls: [],
    };
  }

  private clean(
    text: string
  ): string {
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
  ): Plan {
    if (
      !text ||
      text === "{}"
    ) {
      return {
        toolCalls: [],
      };
    }

    let parsed: unknown;

    try {
      parsed =
        JSON.parse(text);
    } catch {
      return {
        toolCalls: [],
      };
    }

    if (
      typeof parsed !==
        "object" ||
      parsed === null
    ) {
      return {
        toolCalls: [],
      };
    }

    const plan =
      parsed as Partial<Plan>;

    if (
      !Array.isArray(
        plan.toolCalls
      )
    ) {
      return {
        toolCalls: [],
      };
    }

    const toolCalls =
      plan.toolCalls.filter(
        (
          tool
        ): tool is ToolCall => {
          if (!tool) {
            return false;
          }

          if (
            !VALID_TOOLS.has(
              tool.tool
            )
          ) {
            return false;
          }

          if (
            !VALID_ACTIONS.has(
              tool.action as ToolAction
            )
          ) {
            return false;
          }

          return true;
        }
      );

    return {
      toolCalls,
    };
  }
}

export const planner =
  new Planner();