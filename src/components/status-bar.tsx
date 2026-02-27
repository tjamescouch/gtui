import React from "react";
import { Box, Text } from "ink";
import type { Usage, VimMode } from "../types.js";

interface StatusBarProps {
  model: string;
  provider: string;
  usage: Usage;
  mode: VimMode;
  messageCount: number;
}

export function StatusBar({
  model,
  provider,
  usage,
  mode,
  messageCount,
}: StatusBarProps) {
  const modeColor = mode === "normal" ? "yellow" : "green";

  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box gap={2}>
        <Text color={modeColor} bold>
          {mode.toUpperCase()}
        </Text>
        <Text color="gray">
          {provider || "auto"}:{model || "default"}
        </Text>
      </Box>
      <Box gap={2}>
        <Text color="gray">
          msgs:{messageCount}
        </Text>
        <Text color="gray">
          in:{usage.inputTokens} out:{usage.outputTokens}
        </Text>
        <Text color="cyan" bold>
          gtui
        </Text>
      </Box>
    </Box>
  );
}
