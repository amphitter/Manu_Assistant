import { provider } from "@/lib/ai";

import { Memory } from "./Memory";
import { Planner } from "./Planner";
import { PromptBuilder } from "./PromptBuilder";
import { ToolExecutor } from "./ToolExecutor";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentMessage,
  AgentRequest,
} from "../types";

const MAX_CONTEXT_CHARS = 30000;

const MAX_HISTORY = 20;

export class ChatAgent {
  private planner =
    new Planner();

  private memory =
    new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  async *chat(
    request: AgentRequest
  ) {
    // ------------------------------------
    // Memory
    // ------------------------------------

    this.memory = new Memory();

    for (const message of request.messages.slice(-MAX_HISTORY)) {
      this.memory.add(message);
    }

    const last =
      request.messages.at(-1);

    if (!last) {
      return;
    }

    console.log(
      "\n========== CHAT =========="
    );

    console.log(last.content);

    console.log(
      "==========================\n"
    );

    // ------------------------------------
    // Planner
    // ------------------------------------

    const plan =
      await this.planner.plan(
        last.content
      );

    console.log(
      "\n========== PLAN =========="
    );

    console.dir(plan, {
      depth: null,
    });

    console.log(
      "==========================\n"
    );

    // ------------------------------------
    // Execute Planner Tools
    // ------------------------------------

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

    // ------------------------------------
    // Trim Context
    // ------------------------------------

    if (
      toolContext.length >
      MAX_CONTEXT_CHARS
    ) {
      console.warn(
        `Context trimmed (${toolContext.length} -> ${MAX_CONTEXT_CHARS})`
      );

      toolContext =
        toolContext.slice(
          0,
          MAX_CONTEXT_CHARS
        );
    }

    // ------------------------------------
    // Prompt
    // ------------------------------------

    const messages: AgentMessage[] =
      [];

    if (toolContext) {
      messages.push({
        role: "system",
        content: toolContext,
      });
    }

    messages.push(
      ...this.memory.recent()
    );

    const prompt =
      this.promptBuilder.build(
        messages
      );

    console.log(
      "\n======= CHAT PROMPT ======="
    );

    console.dir(prompt, {
      depth: null,
    });

    console.log(
      "===========================\n"
    );

    const chars =
      prompt.reduce(
        (sum, message) =>
          sum +
          message.content.length,
        0
      );

    console.log(
      "\n======= CHAT STATS ======="
    );

    console.log(
      "Messages:",
      prompt.length
    );

    console.log(
      "Characters:",
      chars
    );

    console.log(
      "Estimated Tokens:",
      Math.ceil(chars / 4)
    );

    console.log(
      "==========================\n"
    );

      // ------------------------------------
    // LLM Streaming
    // ------------------------------------

    console.time("LLM");

    try {
      for await (const token of provider.stream({
        model:
          request.model,
        messages: prompt,
      })) {
        // Stream directly to the client
        yield token;
      }
    } catch (error) {
      console.error(
        "\n======= CHAT ERROR ======="
      );

      console.error(error);

      console.log(
        "==========================\n"
      );

      yield "\n\n❌ Failed to generate response.";
    } finally {
      console.timeEnd(
        "LLM"
      );
    }
  }
}

export const chatAgent =
  new ChatAgent();