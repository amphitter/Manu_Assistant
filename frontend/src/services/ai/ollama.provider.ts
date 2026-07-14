import ollama from "ollama";

import { AIProvider } from "./provider";
import {
  AIModel,
  ChatCompletionRequest,
} from "./types";

export class OllamaProvider
  implements AIProvider
{
  async chat(
    request: ChatCompletionRequest
  ): Promise<string> {
    try {
      const response = await ollama.chat({
        model: request.model,
        stream: false,

        options: {
          temperature: 0.2,
        },

        messages: request.messages,
      });

      return response.message.content;
    } catch (error) {
      console.error(
        "Ollama Chat Error:",
        error
      );

      throw error;
    }
  }

  async *stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string> {
    try {
      console.time("llm");

      const stream = await ollama.chat({
        model: request.model,
        stream: true,

        options: {
          temperature: 0.2,
        },

        messages: request.messages,
      });

      console.timeEnd("llm");

      for await (const chunk of stream) {
        const token =
          chunk.message.content ?? "";

        if (!token) continue;

        yield token;
      }
    } catch (error) {
      console.error(
        "Streaming Error:",
        error
      );

      throw error;
    }
  }

  async listModels(): Promise<
    AIModel[]
  > {
    const models = await ollama.list();

    return models.models.map((m) => ({
      name: m.model,
    }));
  }

  async health(): Promise<boolean> {
    try {
      await ollama.list();
      return true;
    } catch {
      return false;
    }
  }
}