import { Planner } from "./Planner";
import { Memory } from "./Memory";
import { ToolExecutor } from "./ToolExecutor";
import { PromptBuilder } from "./PromptBuilder";
import { ExecutionEngine } from "./ExecutionEngine";
import { coder } from "./Coder";

import { contextBuilder } from "../context/ContextBuilder";

import {
  AgentMessage,
  AgentRequest,
} from "../types";

const MAX_HISTORY = 20;

const MAX_CONTEXT_CHARS = 30000;

const MAX_STEPS = 10;

export class CodingAgent {
  private planner =
    new Planner();

  private memory =
    new Memory();

  private promptBuilder =
    new PromptBuilder();

  private toolExecutor =
    new ToolExecutor();

  private execution =
    new ExecutionEngine();

  async execute(
    request: AgentRequest
  ): Promise<string> {
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
      return "No request.";
    }

    console.log(
      "\n====== CODING REQUEST ======"
    );

    console.log(last.content);

    console.log(
      "============================\n"
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
    // Initial Project Context
    // ------------------------------------

    let toolContext = "";

    if (plan.toolCalls.length) {
      const results =
        await this.toolExecutor.execute(
          plan.toolCalls
        );

      toolContext =
        await contextBuilder.build(
          results,
          last.content
        );
    }

    if (
      toolContext.length >
      MAX_CONTEXT_CHARS
    ) {
      toolContext =
        toolContext.slice(
          0,
          MAX_CONTEXT_CHARS
        );
    }

    const conversation: AgentMessage[] =
      [];

    if (toolContext) {
      conversation.push({
        role: "system",
        content: toolContext,
      });
    }

    conversation.push(
      ...this.memory.recent()
    );

    // ------------------------------------
    // Recursive Coding Loop
    // ------------------------------------

    for (
      let step = 1;
      step <= MAX_STEPS;
      step++
    ) {
      console.log(
        `\n========== CODER STEP ${step} ==========\n`
      );

      const prompt =
        this.promptBuilder.build(
          conversation
        );

      console.log(
        "\n======= CODER PROMPT ======="
      );

      console.dir(prompt, {
        depth: null,
      });

      console.log(
        "============================\n"
      );

      const codePlan =
        await coder.generate(
          prompt
        );

      console.log(
        "\n======= CODE PLAN ======="
      );

      console.dir(codePlan, {
        depth: null,
      });

      console.log(
        "=========================\n"
      );

      conversation.push({
        role: "assistant",
        content:
          codePlan.message,
      });

      // Nothing left to execute

      if (
        !codePlan.toolCalls.length
      ) {
        return codePlan.message;
      }

      // ------------------------------------
      // Execute Filesystem Operations
      // ------------------------------------

      const execution =
        await this.execution.execute(
          codePlan.toolCalls
        );

      const context =
        await contextBuilder.build(
          execution.results,
          last.content
        );

      conversation.push({
        role: "system",
        content: context,
      });

      // ------------------------------------
      // Automatic Build
      // ------------------------------------

      console.log(
        "\n======= BUILD ======="
      );

      const build =
        await this.execution.execute([
          {
            tool: "terminal",
            action: "run",
            command:
              "npm run build",
          },
        ]);

      console.log(
        build.summary
      );

      console.log(
        "=====================\n"
      );

      const buildContext =
        [
          "BUILD RESULT",
          "",
          build.summary,
          "",
          ...build.results.map(
            (r) => r.content
          ),
        ].join("\n");

      conversation.push({
        role: "system",
        content:
          buildContext,
      });

      // ------------------------------------
      // Success
      // ------------------------------------

      if (build.success) {
        console.log(
          "\n✅ BUILD SUCCESS\n"
        );

        return (
          codePlan.message +
          "\n\n✅ Build passed successfully."
        );
      }

      console.log(
        "\n❌ BUILD FAILED\n"
      );

      // Loop continues automatically
    }

    return "Maximum coding iterations reached before achieving a successful build.";
  }
}

export const codingAgent =
  new CodingAgent();