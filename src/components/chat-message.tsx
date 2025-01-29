"use client";

import { memo, useCallback, useEffect, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { LLMAnalysis } from "@/components/llm-analysis";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import * as prettier from "prettier";
import prettierPluginBabel from "prettier/plugins/babel";
import prettierPluginEstree from "prettier/plugins/estree";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, Copy, User, Check } from "lucide-react";
import { ComponentProps } from "react";
import { CodeBlock } from "@/components/ui/codeblock";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const MemoizedReactMarkdown = memo(
  ReactMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

const components: Components = {
  p: ({ children }) => (
    <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
  ),
  pre: ({ children }) => children,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children);

    // If we have a language class, this is a code block
    if (match) {
      const language = match[1];
      return (
        <CodeBlock
          language={language}
          value={code}
          showLineNumbers={code.includes("\n")}
          className="my-4"
        />
      );
    }

    // Otherwise it's inline code
    return (
      <code className="bg-navy-darker/80 text-navy-lightest px-1.5 py-0.5 rounded-md text-sm border border-navy-light/50 font-mono">
        {children}
      </code>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc pl-6 marker:text-navy-lighter">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 marker:text-navy-lighter">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed mb-1">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-navy-lighter hover:text-navy-lightest transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mb-4 text-navy-lightest">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold mb-3 text-navy-lightest">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold mb-2 text-navy-lightest">{children}</h3>
  ),
};

const Avatar = ({ isUser }: { isUser: boolean }) => (
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
);

const CopyButton = ({
  onClick,
  copied,
}: {
  onClick: () => void;
  copied: boolean;
}) => (
  <button
    onClick={onClick}
    className="p-1.5 hover:bg-navy-light/10 rounded transition-colors text-navy-lightest"
    title="Copy raw markdown"
  >
    {copied ? (
      <Check className="w-4 h-4 text-green-400" />
    ) : (
      <Copy className="w-4 h-4" />
    )}
  </button>
);

const LoadingDots = () => (
  <div className="flex items-center gap-2 h-6">
    {[0, 0.2, 0.4].map((delay, i) => (
      <motion.span
        key={i}
        className="w-2 h-2 bg-navy-lighter rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, delay }}
      />
    ))}
  </div>
);

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [formattedParts, setFormattedParts] = useState<Array<{
    type: "text" | "code" | "tool-call";
    content: string;
    language?: string;
    isStreaming?: boolean;
  }>>([]);


  useEffect(() => {
    if (!isUser && content) {
      const processContent = async () => {
        try {
            let currentContent = content;
            let parts: Array<{
            type: "text" | "code" | "tool-call";
            content: string;
            language?: string;
            isStreaming?: boolean;
            }> = [];
            let currentIndex = 0;

            // Check for TOOL_CALL sections
            const toolCallStart = currentContent.indexOf("TOOL_CALL");
            const toolCallEnd = currentContent.indexOf("TOOL_CALL_DONE");

            if (toolCallStart !== -1) {
              // Add text before TOOL_CALL if exists
              if (toolCallStart > 0) {
              parts.push({
                type: "text",
                content: currentContent.slice(0, toolCallStart)
              });
              }

              // Add tool call section
              const toolCallContent = toolCallEnd !== -1 
              ? currentContent.slice(toolCallStart, toolCallEnd + 14)
              : currentContent.slice(toolCallStart);

              parts.push({
              type: "tool-call",
              content: toolCallContent,
              isStreaming: toolCallEnd === -1
              });

              // Process remaining content after TOOL_CALL_DONE
              if (toolCallEnd !== -1) {
              currentContent = currentContent.slice(toolCallEnd + 14);
              currentIndex = 0;
              }
            }

            // Process code blocks in remaining content
            while (currentIndex < currentContent.length) {
            const codeBlockStart = currentContent.indexOf("```", currentIndex);
            
            if (codeBlockStart !== -1) {
              // Add text before code block
              if (codeBlockStart > currentIndex) {
              parts.push({
                type: "text",
                content: currentContent.slice(currentIndex, codeBlockStart)
              });
              }

              const afterStartMarker = currentContent.slice(codeBlockStart + 3);
              const languageMatch = afterStartMarker.match(/^(\w+)?\n/);
              const language = languageMatch ? languageMatch[1] || "text" : "text";
              const codeEndIndex = currentContent.indexOf("```", codeBlockStart + 3);

              if (codeEndIndex !== -1) {
              const codeContent = currentContent
                .slice(codeBlockStart + 3, codeEndIndex)
                .replace(/^(\w+)?\n/, "");

              parts.push({
                type: "code",
                content: codeContent,
                language,
                isStreaming: false
              });

              currentIndex = codeEndIndex + 3;
              } else {
              const codeContent = afterStartMarker.replace(/^(\w+)?\n/, "");
              parts.push({
                type: "code",
                content: codeContent,
                language,
                isStreaming: true
              });
              break;
              }
            } else {
              // Add remaining text
              parts.push({
              type: "text",
              content: currentContent.slice(currentIndex)
              });
              break;
            }
            }

            setFormattedParts(parts);
        } catch (err) {
          console.error("[ChatMessage] Content processing failed:", err);
          setFormattedParts([{ type: "text", content }]);
        }
      };

      processContent();
    }
  }, [isUser, content]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[ChatMessage] Failed to copy text:", err);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, height: { duration: 0 } }}
      className={cn(
        "flex gap-4 p-6 rounded-lg border backdrop-blur-sm shadow-lg",
        isUser
          ? "bg-navy-light/80 border-navy ml-12"
          : "bg-navy/80 border-navy-light mr-12"
      )}
    >
      <Avatar isUser={isUser} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-navy-lightest">
            {isUser ? "You" : "Assistant"}
          </div>
          {!isUser && content && (
            <CopyButton
              onClick={() => copyToClipboard(content)}
              copied={copied}
            />
          )}
        </div>
        <div
          className={cn(
            "prose prose-sm max-w-none prose-invert",
            "break-words"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed text-navy-lightest">
              {content}
            </p>
          ) : formattedParts.length > 0 ? (
            <div className="space-y-4">
                {formattedParts.map((part, index) => {
                if (part.type === "tool-call") {
                  return (
                  <LLMAnalysis
                    key={index}
                    content={part.content}
                    isStreaming={part.isStreaming}
                  />
                  );
                }
                if (part.type === "text") {
                  return part.content ? (
                  <MemoizedReactMarkdown
                    key={index}
                    remarkPlugins={[remarkGfm]}
                    className="text-sm text-navy-lightest"
                    components={components}
                  >
                    {part.content.trim()}
                  </MemoizedReactMarkdown>
                  ) : null;
                }
                return (
                  <CodeBlock
                  key={index}
                  language={part.language || "text"}
                  value={part.content}
                  isStreaming={part.isStreaming}
                  showLineNumbers={part.content.includes("\n")}
                  />
                );
                })}
            </div>
          ) : (
            <LoadingDots />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(ChatMessage);
