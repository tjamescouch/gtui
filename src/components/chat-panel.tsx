import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import chalk from "chalk";
import type { Message } from "../types.js";

/** Strip ANSI escape codes to get visible character count. */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Hard-break a string (possibly with ANSI codes) at maxWidth visible chars. */
function hardBreak(s: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let buf = "";
  let vis = 0;
  // Walk character by character, preserving ANSI sequences intact
  const ansiRe = /\x1b\[[0-9;]*m/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = ansiRe.exec(s)) !== null) {
    // Process plain text before this ANSI sequence
    const plain = s.slice(last, match.index);
    for (const ch of plain) {
      if (vis >= maxWidth) {
        pieces.push(buf);
        buf = "";
        vis = 0;
      }
      buf += ch;
      vis++;
    }
    // ANSI escape — append without counting visible width
    buf += match[0];
    last = ansiRe.lastIndex;
  }
  // Remaining plain text after last ANSI sequence
  const tail = s.slice(last);
  for (const ch of tail) {
    if (vis >= maxWidth) {
      pieces.push(buf);
      buf = "";
      vis = 0;
    }
    buf += ch;
    vis++;
  }
  if (buf) pieces.push(buf);
  return pieces;
}

/** Wrap a single line to fit within maxWidth visible characters. */
function wrapLine(line: string, maxWidth: number): string[] {
  const visible = stripAnsi(line);
  if (visible.length <= maxWidth) return [line];

  // Word-wrap on the raw string, tracking visible width
  const words = line.split(/( +)/);
  const lines: string[] = [];
  let current = "";
  let currentVisible = 0;

  for (const word of words) {
    const wordVisible = stripAnsi(word).length;
    // Hard-break words that are longer than maxWidth
    if (wordVisible > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
        currentVisible = 0;
      }
      const broken = hardBreak(word, maxWidth);
      for (let i = 0; i < broken.length - 1; i++) {
        lines.push(broken[i]);
      }
      current = broken[broken.length - 1];
      currentVisible = stripAnsi(current).length;
      continue;
    }
    if (currentVisible + wordVisible > maxWidth && currentVisible > 0) {
      lines.push(current);
      current = "";
      currentVisible = 0;
    }
    current += word;
    currentVisible += wordVisible;
  }
  if (current) lines.push(current);
  return lines;
}

interface ChatPanelProps {
  messages: Message[];
  scrollOffset: number;
  height: number;
  isFocused: boolean;
  showThinking: boolean;
  showTools: boolean;
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

function renderMessage(msg: Message, showThinking: boolean, showTools: boolean): string {
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

  // Show tool calls if enabled and present
  if (showTools && msg.toolCalls && msg.toolCalls.length > 0) {
    const toolLines = msg.toolCalls
      .map((tc) => chalk.dim.yellow(`  → ${tc.name}('${tc.snippet}')`))
      .join("\n");
    parts.push(toolLines);
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
  showTools,
}: ChatPanelProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 120;

  const rendered = useMemo(() => {
    if (messages.length === 0) {
      return chalk.gray("No messages yet. Type a message to begin.");
    }

    const blocks = messages.map((m) => renderMessage(m, showThinking, showTools));
    const rawLines = blocks.join("\n\n").split("\n");

    // Wrap lines to fit available width
    // Sidebar is 20% of termWidth (min 20). Chat panel gets the rest minus borders (2) and paddingX (2).
    const sidebarWidth = Math.max(20, Math.floor(termWidth * 0.2));
    const availableWidth = Math.max(20, termWidth - sidebarWidth - 4);
    const allLines = rawLines.flatMap((line) => wrapLine(line, availableWidth));

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
  }, [messages, scrollOffset, height, showThinking, showTools, termWidth]);

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
        {showTools && (
          <Text color="yellow" dimColor> [Tools]</Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <Text wrap="truncate-end">{rendered}</Text>
      </Box>
    </Box>
  );
}
