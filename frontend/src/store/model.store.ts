import { create } from "zustand";
import { modelService, LocalModel } from "@/services/models/model.service";

interface ModelStore {
  models: LocalModel[];
  selectedModel: string;

  loadModels: () => Promise<void>;

  setSelectedModel: (model: string) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],

  selectedModel: "qwen3:4b",

  async loadModels() {
    try {
      const models = await modelService.getModels();

      set({
        models,
      });
    } catch (error) {
      console.error(error);
    }
  },

  setSelectedModel(model) {
    localStorage.setItem(
      "selected-model",
      model
    );

    set({
      selectedModel: model,
    });
  },
}));