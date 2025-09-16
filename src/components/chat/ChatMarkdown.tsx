// @ts-nocheck
import React from "react";
import ReactMarkdown from "react-markdown";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={className ?? "prose prose-sm max-w-none dark:prose-invert [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2 [&>li]:mb-1 [&>strong]:font-semibold"}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
