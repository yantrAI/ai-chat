"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  value: string;
  isStreaming?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeBlock = ({
  language,
  value,
  isStreaming,
  showLineNumbers = true,
  className,
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [formattedValue, setFormattedValue] = useState(value);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Format the value when it changes
  useEffect(() => {
    // Split into lines, filter empty lines at the end during streaming
    const lines = value.split('\n');
    const nonEmptyLines = isStreaming 
      ? lines.filter((line, index) => {
          if (index === lines.length - 1) return true; // Keep last line during streaming
          return line.trim() !== '';
        })
      : lines;
    
    // Join lines back together
    const formatted = nonEmptyLines.join('\n');
    
    // Ensure there's always a newline at the end for proper formatting
    setFormattedValue(formatted + (formatted.endsWith('\n') ? '' : '\n'));
  }, [value, isStreaming]);

  return (
    <div className={cn("relative font-mono text-sm", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-[#1c1c1c] border-[#333333] rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          {language && (
            <span className="text-xs text-[#666666] font-medium">
              {language.toUpperCase()}
            </span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#888888] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div
        className={cn(
          "bg-[#1c1c1c] overflow-x-auto rounded-b-lg",
          isStreaming && "animate-pulse"
        )}
      >
        <SyntaxHighlighter
          language={language.toLowerCase()}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          customStyle={{
            margin: 0,
            background: "transparent",
            padding: "1rem",
          }}
          lineNumberStyle={{
            color: "#666666",
            paddingRight: "1rem",
            userSelect: "none",
          }}
          codeTagProps={{
            style: {
              fontFamily: "inherit",
              fontSize: "inherit",
              whiteSpace: "pre",
            },
          }}
        >
          {formattedValue}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
