"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { SendHorizontal, Bot, XCircle } from "lucide-react";
import ChatMessage from "@/components/chat-message";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          chatHistory: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      // Add an empty assistant message that we'll update
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" } as Message,
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullMessage = "";
      let buffer = ""; // Buffer for incomplete chunks
      let markdownBuffer = ""; // Buffer for markdown processing
      console.log("Starting to process stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream completed. Final message:", fullMessage);
          if (!fullMessage.trim()) {
            console.error("No response content received");
            throw new Error("No response received from the server");
          }
          break;
        }

        // Process the SSE data
        const text = decoder.decode(value);
        console.log("Received raw chunk:", text);
        buffer += text;

        // Split buffer into lines and process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last line in buffer if it's incomplete

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();
            console.log("Processing data chunk:", data);

            if (data === "[DONE]") {
              console.log("Received [DONE] signal");
              break;
            }

            if (data.startsWith("Error:")) {
              console.error("Received error from server:", data);
              throw new Error(data.slice(7));
            }

            // Add to markdown buffer and process complete markdown elements
            markdownBuffer += data;
            console.log("Current markdown buffer:", markdownBuffer);

            // Process complete markdown elements (lists, code blocks, etc)
            const processedMarkdown = markdownBuffer
              .replace(/\* /g, "\n* ") // Add newline before unordered list items
              .replace(/(\d+\.) /g, "\n$1 ") // Add newline before ordered list items
              .replace(/```(\w+)?\n/g, "\n```$1\n") // Add newlines around code blocks
              .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
              .trim();

            console.log("Processed markdown:", processedMarkdown);
            fullMessage = processedMarkdown;

            // Update the last message in real-time
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
      }
    } catch (error) {
      console.error("Stream Error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setMessages((prev) => prev.slice(0, -1)); // Remove the last empty assistant message
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen ">
      <header className="relative z-10 bg-navy/80 backdrop-blur-sm border-b border-navy-light">
        <div className="max-w-4xl mx-auto p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-navy-lightest">
                Gemma Chat
              </h1>
              <p className="text-sm text-navy-lighter">
                Your intelligent conversation partner
              </p>
            </div>
            {messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearChat}
                className="text-navy-lighter hover:text-navy-lightest transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative z-0">
        <div className="max-w-4xl mx-auto h-full p-4">
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
                      Welcome to Gemma Chat
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

      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background/70 via-background/55 to-background/10 pt-12 z-10">
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className={cn(
                "w-full px-6 py-4 bg-navy/80 backdrop-blur-sm rounded-lg border border-navy-light shadow-lg",
                "text-navy-lightest placeholder-navy-lighter",
                "focus:outline-none focus:ring-2 focus:ring-navy-lighter focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "pr-12"
              )}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "w-8 h-8 rounded-lg flex items-center justify-center",
                "text-navy-lighter hover:text-navy-lightest transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-navy-lighter border-t-navy-lightest rounded-full animate-spin" />
              ) : (
                <SendHorizontal className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
