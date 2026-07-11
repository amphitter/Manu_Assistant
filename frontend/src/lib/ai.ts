import { aiRegistry } from "@/services/ai";
import { OllamaProvider } from "@/services/ai/ollama.provider";

const provider = new OllamaProvider();

aiRegistry.register(provider);

export { provider };