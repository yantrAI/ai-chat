"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Model = {
  id: string;
  name: string;
  description: string;
  features?: string[];
  active: boolean;
  comingSoon?: boolean;
};

type ModelsContextType = {
  models: Model[];
  selectedModel: Model | null;
  setSelectedModel: (model: Model) => void;
  isLoading: boolean;
  error: string | null;
};

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export function ModelsProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) throw new Error("Failed to fetch models");

        const data = await response.json();
        setModels(data);

        // Set the first active model as selected by default
        const defaultModel = data.find((m: Model) => m.active);
        if (defaultModel) setSelectedModel(defaultModel);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, []);

  return (
    <ModelsContext.Provider
      value={{
        models,
        selectedModel,
        setSelectedModel,
        isLoading,
        error,
      }}
    >
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelsContext);
  if (context === undefined) {
    throw new Error("useModels must be used within a ModelsProvider");
  }
  return context;
}
