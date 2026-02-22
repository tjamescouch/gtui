import React, { useMemo } from "react";
import { Box, Text } from "ink";
import chalk from "chalk";
import type { Message } from "../types.js";

interface ChatPanelProps {
  messages: Message[];
  scrollOffset: number;
  height: number;
  isFocused: boolean;
  showThinking: boolean;
}

function formatMarkdown(text: string): string {
  // Lightweight markdown: bold, inline code, code blocks
  let result = text;

  // Code blocks: ```...```
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.slice(3, -3).replace(/^\w*\n/, "");
    return chalk.gray(code);
  });

  // Inline code: `...`
  result = result.replace(/`([^`]+)`/g, (_m, code: string) => chalk.cyan(code));

  // Bold: **...**
  result = result.replace(/\*\*([^*]+)\*\*/g, (_m, text: string) => chalk.bold(text));

  // Italic: *...*
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_m, text: string) => chalk.italic(text));

  return result;
}

function renderMessage(msg: Message, showThinking: boolean): string {
  const roleLabel =
    msg.role === "user"
      ? chalk.blue.bold("You")
      : chalk.green.bold("Assistant");

  const parts: string[] = [roleLabel];

  // Show reasoning/thinking block if enabled and present
  if (showThinking && msg.reasoning) {
    const thinkingHeader = chalk.dim.magenta("  thinking");
    const thinkingContent = msg.reasoning
      .split("\n")
      .map((line) => chalk.dim.magenta("  " + line))
      .join("\n");
    const thinkingEnd = chalk.dim.magenta("  /thinking");
    parts.push(`${thinkingHeader}\n${thinkingContent}\n${thinkingEnd}`);
  }

  const content = formatMarkdown(msg.content);
  const cursor = msg.isStreaming ? chalk.yellow("█") : "";
  parts.push(`${content}${cursor}`);

  return parts.join("\n");
}

export function ChatPanel({
  messages,
  scrollOffset,
  height,
  isFocused,
  showThinking,
}: ChatPanelProps) {
  const rendered = useMemo(() => {
    if (messages.length === 0) {
      return chalk.gray("No messages yet. Type a message to begin.");
    }

    const blocks = messages.map((m) => renderMessage(m, showThinking));
    const allLines = blocks.join("\n\n").split("\n");

    const totalLines = allLines.length;
    const visibleHeight = Math.max(1, height - 2); // account for borders

    // Calculate effective scroll: clamp offset
    let startLine: number;
    if (scrollOffset >= totalLines - visibleHeight) {
      startLine = Math.max(0, totalLines - visibleHeight);
    } else {
      startLine = Math.max(0, scrollOffset);
    }

    return allLines.slice(startLine, startLine + visibleHeight).join("\n");
  }, [messages, scrollOffset, height, showThinking]);

  const borderColor = isFocused ? "blue" : "gray";

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={borderColor}
      flexGrow={1}
      paddingX={1}
    >
      <Box marginBottom={0}>
        <Text bold color={borderColor}>
          Chat
        </Text>
        {showThinking && (
          <Text color="magenta" dimColor> [CoT]</Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <Text>{rendered}</Text>
      </Box>
    </Box>
  );
}
