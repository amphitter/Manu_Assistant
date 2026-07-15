"use client";

import { useEffect, useState } from "react";

import { ChevronDown } from "lucide-react";

import { useModelStore } from "@/store/model.store";

export default function ModelSelector() {
  const {
    models,
    selectedModel,
    loadModels,
    setSelectedModel,
  } = useModelStore();

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
    loadModels();
  }, [loadModels]);

  if (!mounted) {
    return (
      <div className="relative inline-flex items-center">
        <div className="h-[38px] w-44 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedModel}
        aria-label="Select model"
        onChange={(e) =>
          setSelectedModel(
            e.target.value
          )
        }
        className="appearance-none cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-3 pr-8 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      >
        {models.length === 0 ? (
          <option value="">
            Loading models...
          </option>
        ) : (
          models.map((model) => (
            <option
              key={model.id}
              value={model.id}
            >
              {model.name}
            </option>
          ))
        )}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 text-zinc-500"
      />
    </div>
  );
}