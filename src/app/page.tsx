"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Loader2, XCircle } from "lucide-react";
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Process the SSE data
        const text = decoder.decode(value);
        buffer += text; // Add new text to buffer

        // Split buffer into lines and process complete lines
        const lines = buffer.split("\n");
        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();

            if (data === "[DONE]") {
              break;
            }

            fullMessage += data;

            // Update the last message in real-time
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: fullMessage.trim(),
              };
              return newMessages;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
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
    <div className="flex flex-col h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-10 bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/75">
        <div className="max-w-4xl mx-auto p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-light">Gemma Chat</h1>
              <p className="text-sm text-tertiary">
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
                className="text-tertiary hover:text-light transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden pt-24 pb-32">
        <div className="max-w-4xl mx-auto h-full p-4">
          <div className="h-full overflow-y-auto rounded-lg border border-secondary/10 bg-secondary/5 p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex h-full items-center justify-center text-tertiary"
                >
                  <p>Start a conversation by sending a message</p>
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-lg bg-red-500/10 text-red-500 dark:bg-red-950/20 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <motion.input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className={cn(
                "flex-1 rounded-lg border border-secondary bg-secondary/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                isLoading && "opacity-50"
              )}
              disabled={isLoading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            />
            <motion.button
              type="submit"
              disabled={isLoading}
              className={cn(
                "rounded-lg bg-primary px-4 py-3 text-light transition-colors hover:bg-primary/90",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
            </motion.button>
          </form>
        </div>
      </footer>
    </div>
  );
}
