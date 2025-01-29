"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LLMAnalysisProps {
	content: string;
	isStreaming?: boolean;
}

const extractProcessName = (content: string): string => {
	// Look for tags like <fetching url> or <searching>
	const tagMatch = content.match(/<([^>]+)>/);
	if (tagMatch) {
		return tagMatch[1];
	}
	
	// Look for tool name in TOOL_CALL
	const toolMatch = content.match(/TOOL_CALL\s*<([^>]+)>/);
	if (toolMatch) {
		return `Running ${toolMatch[1]}`;
	}
	
	// Default process name if no tag found
	return "Analysis in progress";
};

export const LLMAnalysis = ({ content, isStreaming }: LLMAnalysisProps) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const processName = extractProcessName(content);

	return (
		<div className="my-2 bg-navy-darker/50 rounded-lg border border-navy-light/30">
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full px-4 py-2 flex items-center gap-2 text-sm text-navy-lightest hover:bg-navy-light/10 transition-colors rounded-lg"
			>
				{isExpanded ? (
					<ChevronDown className="w-4 h-4" />
				) : (
					<ChevronRight className="w-4 h-4" />
				)}
				<span className="font-medium">{processName}</span>
				{isStreaming && (
					<Loader2 className="w-4 h-4 animate-spin ml-2 text-navy-lighter" />
				)}
			</button>
			
			{isExpanded && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					className="px-4 py-2 border-t border-navy-light/30"
				>
					<pre className="text-xs text-navy-lighter whitespace-pre-wrap">
						{content}
					</pre>
				</motion.div>
			)}
		</div>
	);
};