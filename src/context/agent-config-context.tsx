"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AgentConfig } from "@/components/agent-config-modal";

interface AgentConfigContextType {
  config: AgentConfig | null;
  setConfig: (config: AgentConfig) => void;
  clearConfig: () => void;
}

const AgentConfigContext = createContext<AgentConfigContextType | undefined>(
  undefined
);

const STORAGE_KEY = "agent_config";

export function AgentConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AgentConfig | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConfigState(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored agent config:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setConfig = (newConfig: AgentConfig) => {
    setConfigState(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const clearConfig = () => {
    setConfigState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AgentConfigContext.Provider value={{ config, setConfig, clearConfig }}>
      {children}
    </AgentConfigContext.Provider>
  );
}

export function useAgentConfig() {
  const context = useContext(AgentConfigContext);
  if (context === undefined) {
    throw new Error(
      "useAgentConfig must be used within an AgentConfigProvider"
    );
  }
  return context;
}
