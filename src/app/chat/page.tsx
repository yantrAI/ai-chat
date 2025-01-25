"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  SendHorizontal,
  Bot,
  XCircle,
  RotateCw,
  StopCircle,
} from "lucide-react";
import ChatMessage from "@/components/chat-message";
import { cn } from "@/lib/utils";
import { useModels } from "@/context/models-context";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const { selectedModel } = useModels();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const generateResponse = async (userMessage: string, regenerate = false) => {
    let fullMessage = "";

    try {
      if (!selectedModel) return;

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Create a copy of current messages for chat history
      const currentMessages = [...messages];

      // For regeneration, only remove if last message is from assistant
      if (
        regenerate &&
        currentMessages[currentMessages.length - 1]?.role === "assistant"
      ) {
        setMessages((prev) => prev.slice(0, -1));
      }

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: currentMessages,
          modelId: selectedModel.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let markdownBuffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!fullMessage.trim()) {
              throw new Error("No response received from the server");
            }
            break;
          }

          buffer += decoder.decode(value);

          // Process all complete SSE messages in the buffer
          while (buffer.includes("data: ")) {
            const messageStart = buffer.indexOf("data: ");
            const messageEnd = buffer.indexOf("data: ", messageStart + 1);

            // Extract the message content
            let data;
            if (messageEnd === -1) {
              // Last or only message in buffer
              data = buffer.slice(messageStart + 6);
              buffer = "";
            } else {
              // More messages follow
              data = buffer.slice(messageStart + 6, messageEnd);
              buffer = buffer.slice(messageEnd);
            }

            // Handle the message
            if (data === "[DONE]") {
              break;
            }

            if (data.startsWith("Error:")) {
              throw new Error(data.slice(7));
            }


            // Append raw data without any processing
            markdownBuffer += data;
            fullMessage = markdownBuffer;

            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: fullMessage,
              };
              return newMessages;
            });
          }
        }
      } finally {
        reader.cancel();
      }
    } catch (error) {
      console.error("Stream Error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        // For abort, keep the partial response if we have one
        if (!fullMessage.trim()) {
          setMessages((prev) => prev.slice(0, -1));
        }
      } else {
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
        // Only remove the message for non-abort errors
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedModel) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    await generateResponse(input.trim());
  };

  const handleRegenerate = async () => {
    if (isLoading || !selectedModel || messages.length === 0) return;

    setIsLoading(true);
    setError(null);

    // Find the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "user");

    if (lastUserMessage) {
      // Don't remove any messages before regenerating
      await generateResponse(lastUserMessage.content, true);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  if (!selectedModel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-navy-lighter">
          Please select a model to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="relative z-10 bg-navy/80 backdrop-blur-sm border-b border-navy-light">
        <div className="w-[90%] mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-navy-lightest">
                Chat with {selectedModel.name}
              </h1>
              <p className="text-sm text-navy-lighter">
                {selectedModel.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && !isLoading && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRegenerate}
                  className="text-navy-lighter hover:text-navy-lightest transition-colors"
                  title="Regenerate last response"
                >
                  <RotateCw className="h-6 w-6" />
                </motion.button>
              )}
              {messages.length > 0 && !isLoading && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearChat}
                  className="text-navy-lighter hover:text-navy-lightest transition-colors"
                  title="Clear chat"
                >
                  <XCircle className="h-6 w-6" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="h-full w-[90%] mx-auto px-4 py-4">
          <div className="h-full overflow-y-auto rounded-lg border border-navy-light bg-navy/80 backdrop-blur-sm p-4 space-y-4">
            <div className="flex-1 overflow-x-auto">
              <div className="prose prose-sm prose-invert max-w-none">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-full flex flex-col items-center justify-center text-center p-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-navy/80 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg border border-navy-light">
                      <Bot className="w-8 h-8 text-navy-lightest" />
                    </div>
                    <h1 className="text-2xl font-semibold text-navy-lightest mb-2">
                      Welcome to {selectedModel.name} Chat
                    </h1>
                    <p className="text-navy-lighter max-w-md">
                      I&apos;m here to help you with anything you need. Feel
                      free to ask me questions, request assistance, or just
                      chat!
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-6 pb-24">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        role={message.role}
                        content={message.content}
                      />
                    ))}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-12 p-4 rounded-lg bg-red-900/50 border border-red-800 backdrop-blur-sm"
                      >
                        <p className="text-sm text-red-400">{error}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/70 via-background/55 to-transparent pointer-events-none" />
        <div className="relative w-[90%] mx-auto px-4 pb-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${selectedModel.name} anything...`}
              className={cn(
                "w-full px-6 py-4 bg-navy/80 backdrop-blur-sm rounded-lg border border-navy-light shadow-lg",
                "text-navy-lightest placeholder-navy-lighter",
                "focus:outline-none focus:ring-2 focus:ring-navy-lighter focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "pr-12"
              )}
              disabled={isLoading}
            />
            {isLoading ? (
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  stopGenerating();
                }}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "text-red-400 hover:text-red-300 transition-colors"
                )}
                title="Stop generating"
              >
                <StopCircle className="w-5 h-5" />
              </motion.button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "text-navy-lighter hover:text-navy-lightest transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
