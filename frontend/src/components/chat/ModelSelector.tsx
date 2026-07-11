"use client";

import { useEffect } from "react";
import { useModelStore } from "@/store/model.store";

export default function ModelSelector() {
  const {
    models,
    selectedModel,
    loadModels,
    setSelectedModel,
  } = useModelStore();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <select
      value={selectedModel}
      onChange={(e) =>
        setSelectedModel(e.target.value)
      }
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
    >
      {models.map((model) => (
        <option
          key={model.id}
          value={model.id}
        >
          {model.name}
        </option>
      ))}
    </select>
  );
}