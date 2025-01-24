"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-4 p-6 rounded-lg border backdrop-blur-sm shadow-lg",
        isUser
          ? "bg-navy-light/80 border-navy ml-12"
          : "bg-navy/80 border-navy-light mr-12"
      )}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-10 h-10 rounded-full bg-navy-lighter/80 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border border-navy">
            <User className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-navy-light/80 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border border-navy-lighter">
            <Bot className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-navy-lightest mb-2">
          {isUser ? "You" : "Assistant"}
        </div>
        <div className="prose prose-sm max-w-none prose-invert">
          {isUser ? (
            <p className="text-sm leading-relaxed text-navy-lightest">
              {content}
            </p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="text-sm text-navy-lightest space-y-4 whitespace-pre-wrap break-words"
              components={{
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
                ),
                pre: ({ children, ...props }) => (
                  <div className="overflow-auto w-full my-4 bg-navy/50 backdrop-blur-sm border border-navy-light rounded-lg shadow-md">
                    <pre className="p-4" {...props}>
                      {children}
                    </pre>
                  </div>
                ),
                code: ({ children, ...props }) => (
                  <code
                    className="bg-navy/50 backdrop-blur-sm text-navy-lightest px-1.5 py-0.5 rounded-md text-sm border border-navy-light/50"
                    {...props}
                  >
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-navy-lighter">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-navy-lighter">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-navy-lighter hover:text-navy-lightest transition-colors"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(ChatMessage);
