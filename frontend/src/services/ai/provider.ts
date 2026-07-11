import { ChatCompletionRequest, AIModel } from "./types";

export interface AIProvider {
  chat(request: ChatCompletionRequest): Promise<string>;

  stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<string>;

  listModels(): Promise<AIModel[]>;

  health(): Promise<boolean>;
}