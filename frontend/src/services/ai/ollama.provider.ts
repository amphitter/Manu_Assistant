import ollama from "ollama";

import { AIProvider } from "./provider";
import {
  AIModel,
  AIMessage,
  ChatCompletionRequest,
} from "./types";

export class OllamaProvider implements AIProvider {
  async chat(request: ChatCompletionRequest): Promise<string> {
    const response = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: false,
    });

    return response.message.content;
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<string> {
    const stream = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: true,
    });

    for await (const chunk of stream) {
      yield chunk.message.content;
    }
  }

  async listModels(): Promise<AIModel[]> {
    const response = await ollama.list();

    return response.models.map((model) => ({
      name: model.model,
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