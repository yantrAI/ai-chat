"use client";

import { motion } from "framer-motion";
import { Bot, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useModels } from "@/context/models-context";

function ModelCardSkeleton() {
  return (
    <div className="h-full p-6 rounded-xl border border-navy-light bg-navy/50 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-full">
          <div className="h-7 w-1/3 bg-navy-light/50 rounded-md animate-pulse mb-2" />
          <div className="h-4 w-3/4 bg-navy-light/50 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-navy-light/50" />
            <div className="h-4 w-2/3 bg-navy-light/50 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-4 w-24 bg-navy-light/50 rounded-md animate-pulse" />
    </div>
  );
}

export default function RootPage() {
  const { models, selectedModel, setSelectedModel, isLoading, error } =
    useModels();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="relative z-10 bg-navy/80 backdrop-blur-sm border-b border-navy-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-navy-lightest" />
            <h1 className="text-2xl font-bold text-navy-lightest">
              AI Chat Hub
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="text-4xl font-bold text-navy-lightest mb-6">
                Experience the Power of Open AI Models
              </h2>
              <p className="text-lg text-navy-lighter mb-12">
                Welcome to AI Chat Hub, your gateway to exploring cutting-edge
                AI models. Chat with various open-source AI models and
                experience their unique capabilities - all completely free and
                accessible.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
            >
              {isLoading ? (
                // Show skeleton loaders while loading
                [1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                  >
                    <ModelCardSkeleton />
                  </motion.div>
                ))
              ) : error ? (
                <div className="col-span-3 text-center p-6 rounded-xl border border-red-500/50 bg-red-500/10">
                  <p className="text-red-500">Failed to load models: {error}</p>
                </div>
              ) : (
                // Show actual model cards
                models.map((model, index) => (
                  <motion.div
                    key={model.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                    className={cn(
                      "relative group",
                      model.comingSoon && "opacity-75"
                    )}
                  >
                    <div
                      className={cn(
                        "h-full p-6 rounded-xl border backdrop-blur-sm transition-colors duration-300",
                        model === selectedModel
                          ? "bg-navy-light/50 border-navy-lighter"
                          : model.active
                          ? "bg-navy/50 border-navy-light hover:bg-navy-light/30"
                          : "bg-navy/50 border-navy-light",
                        model.active && "cursor-pointer"
                      )}
                      onClick={() => model.active && setSelectedModel(model)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-navy-lightest mb-2">
                            {model.name}
                          </h3>
                          <p className="text-navy-lighter">
                            {model.description}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {model.features?.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-center text-navy-lighter"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-navy-lighter mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {model.active ? (
                        <Link
                          href="/chat"
                          className="inline-flex items-center gap-2 text-navy-lightest hover:text-white transition-colors"
                        >
                          {model === selectedModel
                            ? "Continue Chat"
                            : "Try it now"}{" "}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-navy-lighter">Coming soon</span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-navy/80 backdrop-blur-sm border-t border-navy-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-navy-lighter">
            Built with ❤️ for the AI community
          </p>
        </div>
      </footer>
    </div>
  );
}
