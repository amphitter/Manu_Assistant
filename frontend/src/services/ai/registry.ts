import { AIProvider } from "./provider";

class AIRegistry {
  private provider: AIProvider | null = null;

  register(provider: AIProvider) {
    this.provider = provider;
  }

  get(): AIProvider {
    if (!this.provider) {
      throw new Error("No AI provider registered.");
    }

    return this.provider;
  }
}

export const aiRegistry = new AIRegistry();