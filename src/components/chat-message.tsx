"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <motion.div
      layout
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        role === "user"
          ? "bg-primary/10 dark:bg-primary/20"
          : "bg-secondary/10 dark:bg-secondary/20"
      )}
    >
      <div className="flex-shrink-0">
        {role === "user" ? (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-light">
            <User className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-light">
            <Bot className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-x-auto">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {content}
        </p>
      </div>
    </motion.div>
  );
}
