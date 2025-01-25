"use client";

import { memo, useMemo, useCallback, useEffect, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
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
  const [formattedParts, setFormattedParts] = useState<
    Array<{
      type: "text" | "code";
      content: string;
      language?: string;
      isStreaming?: boolean;
    }>
  >([]);

  useEffect(() => {
    if (!isUser && content) {
      const processContent = async () => {
        try {
          // Keep content exactly as received
          let currentContent = content;
          const codeBlockStart = currentContent.indexOf("```");

          // Always check for new code blocks
          if (codeBlockStart !== -1) {
            const beforeCode = currentContent.slice(0, codeBlockStart);
            const afterStartMarker = currentContent.slice(codeBlockStart + 3);
            const languageMatch = afterStartMarker.match(/^(\w+)?\n/);
            const language = languageMatch ? languageMatch[1] || "text" : "text";
            const codeEndIndex = currentContent.indexOf("```", codeBlockStart + 3);

            if (codeEndIndex !== -1) {
              // Complete code block
              const codeContent = currentContent
                .slice(codeBlockStart + 3, codeEndIndex)
                .replace(/^(\w+)?\n/, "");
              const afterCode = currentContent.slice(codeEndIndex + 3);

              setFormattedParts([
                ...(beforeCode ? [{ type: "text" as const, content: beforeCode }] : []),
                {
                  type: "code" as const,
                  content: codeContent,
                  language,
                  isStreaming: false,
                },
                ...(afterCode ? [{ type: "text" as const, content: afterCode }] : []),
              ]);
            } else {
              // Incomplete code block
              const codeContent = afterStartMarker.replace(/^(\w+)?\n/, "");

              setFormattedParts([
                ...(beforeCode ? [{ type: "text" as const, content: beforeCode }] : []),
                {
                  type: "code" as const,
                  content: codeContent,
                  language,
                  isStreaming: true,
                },
              ]);
            }
          } else {
            // No code block, just text
            setFormattedParts([{ type: "text", content: currentContent }]);
          }
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
              {formattedParts.map((part, index) =>
                part.type === "text" ? (
                  part.content ? (
                    <MemoizedReactMarkdown
                      key={index}
                      remarkPlugins={[remarkGfm]}
                      className="text-sm text-navy-lightest"
                      components={components}
                    >
                      {part.content.trim()}
                    </MemoizedReactMarkdown>
                  ) : null
                ) : (
                  <CodeBlock
                    key={index}
                    language={part.language || "text"}
                    value={part.content}
                    isStreaming={part.isStreaming}
                    showLineNumbers={part.content.includes("\n")}
                  />
                )
              )}
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
