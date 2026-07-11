import { provider } from "@/lib/ai";

import { Memory } from "./Memory";
import { Planner } from "./Planner";
import { PromptBuilder } from "./PromptBuilder";
import { ToolExecutor } from "./ToolExecutor";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentRequest,
  AgentMessage,
} from "../types";

export class Agent {
  private planner = new Planner();

  private memory = new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  async *chat(
    request: AgentRequest
  ) {
    // Always rebuild memory from the current request
    this.memory = new Memory();

    for (const message of request.messages) {
      this.memory.add(message);
    }

    const last =
      request.messages[
        request.messages.length - 1
      ];

    const plan =
      await this.planner.plan(
        last.content
      );

    console.log("\n========== PLAN ==========");
    console.dir(plan, {
      depth: null,
    });
    console.log("==========================\n");

    let toolContext = "";

    if (plan.toolCalls.length) {
      const results =
        await this.toolExecutor.execute(
          plan.toolCalls
        );

      console.log(
        "\n======= TOOL RESULTS ======="
      );
      console.dir(results, {
        depth: null,
      });
      console.log(
        "============================\n"
      );

      toolContext =
        await contextBuilder.build(
          results,
          last.content
        );
    }

    const messages: AgentMessage[] = [];

    // Context FIRST
    if (toolContext) {
      messages.push({
        role: "system",
        content: toolContext,
      });
    }

    // Then chat history
    messages.push(...this.memory.all());

    const prompt =
      this.promptBuilder.build(
        messages
      );

    console.log(
      "\n======= FINAL PROMPT ======="
    );

    console.log(
      prompt
        .map(
          (m) =>
            `[${m.role}]\n${m.content}`
        )
        .join("\n\n")
    );

    console.log(
      "============================\n"
    );

    for await (const token of provider.stream({
      model: request.model,
      messages: prompt,
    })) {
      yield token;
    }
  }
}

export const agent = new Agent();