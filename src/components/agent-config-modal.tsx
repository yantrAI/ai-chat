"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AgentConfig) => void;
  initialConfig?: AgentConfig;
}

export interface AgentConfig {
  name?: string;
  instructions?: string;
  rules?: string;
}

export default function AgentConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: AgentConfigModalProps) {
  const [config, setConfig] = useState<AgentConfig>(() => {
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      const savedConfig = localStorage.getItem("agentConfig");
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    }
    // Fall back to initialConfig or default values
    return (
      initialConfig || {
        name: "",
        instructions: "",
        rules: "",
      }
    );
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agentConfig", JSON.stringify(config));
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = {
      name: "",
      instructions: "",
      rules: "",
    };
    setConfig(defaultConfig);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentConfig");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="w-full max-w-2xl bg-navy rounded-lg shadow-lg border border-navy-light"
        >
          <div className="flex items-center justify-between p-6 border-b border-navy-light">
            <h2 className="text-xl font-semibold text-navy-lightest">
              Customize Agent
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-navy-lighter hover:text-navy-lightest hover:bg-navy-light/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-navy-lightest"
              >
                Agent Name
              </label>
              <input
                type="text"
                id="name"
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
                className={cn(
                  "w-full p-3 rounded-lg",
                  "bg-navy border border-navy-light",
                  "text-navy-lightest placeholder:text-navy-lighter",
                  "focus:outline-none focus:ring-1 focus:ring-navy-lighter",
                  "transition-colors duration-200"
                )}
                placeholder="Enter agent name"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="instructions"
                className="block text-sm font-medium text-navy-lightest"
              >
                Instructions/Prompt
              </label>
              <textarea
                id="instructions"
                value={config.instructions}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                className={cn(
                  "w-full p-3 rounded-lg min-h-[120px]",
                  "bg-navy border border-navy-light",
                  "text-navy-lightest placeholder:text-navy-lighter",
                  "focus:outline-none focus:ring-1 focus:ring-navy-lighter",
                  "transition-colors duration-200",
                  "resize-y"
                )}
                placeholder="Enter instructions for the agent..."
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="rules"
                className="block text-sm font-medium text-navy-lightest"
              >
                Rules/Constraints
              </label>
              <textarea
                id="rules"
                value={config.rules}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, rules: e.target.value }))
                }
                className={cn(
                  "w-full p-3 rounded-lg min-h-[120px]",
                  "bg-navy border border-navy-light",
                  "text-navy-lightest placeholder:text-navy-lighter",
                  "focus:outline-none focus:ring-1 focus:ring-navy-lighter",
                  "transition-colors duration-200",
                  "resize-y"
                )}
                placeholder="Enter rules and constraints..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-navy border border-navy-light",
                  "text-navy-lightest hover:bg-navy-light/30",
                  "transition-colors duration-200"
                )}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-navy border border-navy-light",
                  "text-navy-lightest hover:bg-navy-light/30",
                  "transition-colors duration-200"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-navy-lighter border border-navy-lighter",
                  "text-navy-lightest hover:bg-navy-lighter/80",
                  "transition-colors duration-200"
                )}
              >
                Save Configuration
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
