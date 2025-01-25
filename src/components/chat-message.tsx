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
    const code = String(children).replace(/\n$/, "");

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
    <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-navy-lighter">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-navy-lighter">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
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

  // Track if we're currently in a code block
  const [codeBlockState, setCodeBlockState] = useState<{
    inBlock: boolean;
    language: string;
    textBeforeCode: string;
  }>({
    inBlock: false,
    language: "text",
    textBeforeCode: "",
  });
  const [Exited, setExited] = useState(false);

  // Format code using Prettier
  const formatCode = async (code: string, language: string) => {
    try {
      // Default to typescript for unknown languages
      const parser = getParserForLanguage(language);
      if (!parser) return code;

      const formatted = await prettier.format(code, {
        parser,
        plugins: [prettierPluginBabel, prettierPluginEstree],
        semi: true,
        singleQuote: true,
        trailingComma: "es5",
        printWidth: 80,
        tabWidth: 2,
      });

      // Remove any leading/trailing newlines while preserving indentation
      return formatted.replace(/^\n+|\n+$/g, "");
    } catch (err) {
      console.error("Failed to format code:", err);
      return code;
    }
  };

  // Get the appropriate Prettier parser for a language
  const getParserForLanguage = (language: string): string | null => {
    const parserMap: Record<string, string> = {
      javascript: "babel",
      typescript: "typescript",
      jsx: "babel",
      tsx: "typescript",
      json: "json",
      css: "css",
      scss: "scss",
      less: "less",
      html: "html",
      markdown: "markdown",
      yaml: "yaml",
      graphql: "graphql",
    };
    return parserMap[language.toLowerCase()] || null;
  };

  // Improved content processing with better error handling and streaming support
  useEffect(() => {
    if (!isUser && content && !Exited) {
      const processContent = async () => {
        try {
          if (!codeBlockState.inBlock) {
            // Check if content contains a code block start
            const codeBlockMatch = content.match(/```(\w+)?\s*([\s\S]*?)$/);

            if (codeBlockMatch) {
              const [_, language = "text", codeContent] = codeBlockMatch;
              const beforeCode = content
                .slice(0, content.indexOf("```"))
                .trim();

              // Update state in a single operation
              setCodeBlockState({
                inBlock: true,
                language,
                textBeforeCode: beforeCode,
              });

              // Set initial parts
              setFormattedParts(
                [
                  { type: "text" as const, content: beforeCode },
                  {
                    type: "code" as const,
                    content: codeContent,
                    language,
                    isStreaming: true,
                  },
                ].filter((part) => part.content)
              );
            } else {
              // No code block, treat as regular text
              setFormattedParts([{ type: "text", content }]);
            }
          } else {
            // We're in a code block, check for ending
            if (content.includes("```")) {
              // Code block is complete
              const lastIndex = content.lastIndexOf("```");
              const fullContent = content.substring(0, lastIndex).trim();
              const afterCode = content.substring(lastIndex + 3).trim();

              // Use the same pattern as entry for consistency
              const codeStartMatch = content.match(/```(\w+)?\s*([\s\S]*?)```/);
              let actualCode = codeStartMatch
                ? codeStartMatch[2]
                    .replace(/^\n+|\n+$/g, "")
                    .split("\n")
                    .map((line) => line.replace(/^\s{4}/, ""))
                    .join("\n")
                : fullContent;

              // Format the code using Prettier if possible
              actualCode = await formatCode(
                actualCode,
                codeBlockState.language
              );

              const parts = [
                {
                  type: "text" as const,
                  content: codeBlockState.textBeforeCode,
                },
                {
                  type: "code" as const,
                  content: actualCode,
                  language: codeBlockState.language,
                  isStreaming: false,
                },
              ].filter((part) => part.content);

              if (afterCode) {
                parts.push({ type: "text" as const, content: afterCode });
              }

              setFormattedParts(parts);
              setCodeBlockState({
                inBlock: false,
                language: "text",
                textBeforeCode: "",
              });
              setExited(true);
            } else {
              // Still streaming code - use the same pattern for consistency
              const codeMatch = content.match(/```(\w+)?\s*([\s\S]*)/);
              let codeContent = codeMatch ? codeMatch[2] : content;

              // Preserve whitespace and add newlines for better formatting
              if (codeBlockState.language.toLowerCase() === "python") {
                codeContent = codeContent
                  // First, normalize all whitespace
                  .replace(/\s+/g, " ")
                  // Add newlines after specific Python keywords
                  .replace(
                    /\b(def|class|if|for|while|try|except|finally|else|elif)\b\s*/g,
                    "\n$1 "
                  )
                  // Add newlines after colons
                  .replace(/:\s*/g, ":\n")
                  // Add newlines after comments
                  .replace(/#[^\n]*/g, (match) => match + "\n")
                  // Add newlines before docstrings
                  .replace(/"""/g, '\n"""')
                  // Clean up multiple newlines
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line)
                  .join("\n");
              } else {
                // For other languages (JavaScript, TypeScript, etc.)
                codeContent = codeContent
                  // First, normalize all whitespace
                  .replace(/\s+/g, " ")
                  // Add newlines after specific characters
                  .replace(/([{};])/g, "$1\n")
                  // Add newlines after keywords
                  .replace(
                    /\b(return|if|for|while|do|try|catch|finally|else)\b\s*/g,
                    "\n$1 "
                  )
                  // Clean up multiple newlines
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line)
                  .join("\n");
              }

              setFormattedParts(
                [
                  {
                    type: "text" as const,
                    content: codeBlockState.textBeforeCode,
                  },
                  {
                    type: "code" as const,
                    content: codeContent,
                    language: codeBlockState.language,
                    isStreaming: true,
                  },
                ].filter((part) => part.content)
              );
            }
          }
        } catch (err) {
          console.error("[ChatMessage] Content processing failed:", err);
          setFormattedParts([{ type: "text", content }]);
        }
      };

      processContent();
    }
  }, [isUser, content, codeBlockState, Exited]);

  // Reset Exited state when content changes
  useEffect(() => {
    if (content) {
      setExited(false);
    }
  }, [content]);

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
            "whitespace-pre-wrap break-words"
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
                      {part.content}
                    </MemoizedReactMarkdown>
                  ) : null
                ) : (
                  <CodeBlock
                    key={index}
                    language={part.language || "text"}
                    value={part.content}
                    isStreaming={part.isStreaming}
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
