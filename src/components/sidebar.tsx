"use client";

import { motion } from "framer-motion";
import { Bot, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useModels } from "@/context/models-context";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { models, selectedModel, setSelectedModel, isLoading, error } =
    useModels();

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? "4rem" : "16rem" }}
      className={cn(
        "h-screen bg-navy/80 backdrop-blur-sm border-r border-navy-light flex flex-col",
        "transition-all duration-300 ease-in-out z-50"
      )}
    >
      <div className="flex items-center justify-between py-4 px-4 min-h-[85px] border-b border-navy-light">
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? "1rem" : "auto",
          }}
          transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.5 }}
          className="flex items-center gap-2"
        >
          <Bot className="w-6 h-6 text-navy-lightest" />
          <span className="font-semibold text-navy-lightest whitespace-nowrap">
            AI Chat Hub
          </span>
        </motion.div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "z-50 p-1.5 rounded-lg",
            "text-navy-lighter hover:text-navy-lightest",
            "hover:bg-navy-light/50 transition-colors",
            isCollapsed && "absolute right-2"
          )}
        >
          <motion.div
            initial={false}
            animate={{ rotate: isCollapsed ? 180 : 0 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </button>
      </div>

      <motion.div
        initial={false}
        animate={{
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? "none" : "auto",
        }}
        transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.5 }}
        className="flex-1 overflow-y-auto p-4"
      >
        {isLoading ? (
          <div className="text-navy-lighter">Loading models...</div>
        ) : error ? (
          <div className="text-red-500">Error: {error}</div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                onClick={() => model.active && setSelectedModel(model)}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  model.active && "cursor-pointer",
                  model === selectedModel
                    ? "bg-navy-light/50 border-navy-lighter"
                    : model.active
                      ? "bg-navy/50 border-navy-light hover:border-navy-lighter"
                      : "bg-navy/50 border-navy-light opacity-50",
                  model.comingSoon && "cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-navy-lightest whitespace-nowrap">
                    {model.name}
                    {model === selectedModel && (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{
                          repeat: Infinity,
                          repeatType: "reverse",
                          duration: 1.5,
                        }}
                        className="ml-2 inline-flex"
                      >
                        <Bot className="w-3 h-3 text-navy-lighter" />
                      </motion.div>
                    )}
                  </h3>
                  {model.comingSoon && (
                    <span className="text-xs text-navy-lighter whitespace-nowrap">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-navy-lighter mt-1">
                  {model.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
