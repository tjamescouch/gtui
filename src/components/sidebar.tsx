import React from "react";
import { Box, Text } from "ink";
import type { Session } from "../types.js";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  model: string;
  provider: string;
  isFocused: boolean;
}

export function Sidebar({
  sessions,
  activeSessionId,
  model,
  provider,
  isFocused,
}: SidebarProps) {
  const borderColor = isFocused ? "blue" : "gray";

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={borderColor}
      width="20%"
      minWidth={20}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold color={borderColor}>
          Sessions
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">Model:</Text>
        <Text bold>{model || "default"}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">Provider:</Text>
        <Text bold>{provider || "auto"}</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {sessions.length === 0 ? (
          <Text color="gray" italic>
            No saved sessions
          </Text>
        ) : (
          sessions.map((session) => (
            <Box key={session.id}>
              <Text
                color={session.id === activeSessionId ? "blue" : undefined}
                bold={session.id === activeSessionId}
              >
                {session.id === activeSessionId ? "▸ " : "  "}
                {session.name || session.id.slice(0, 8)}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray" dimColor>
          Tab: switch panel
        </Text>
        <Text color="gray" dimColor>
          q: quit (normal)
        </Text>
        <Text color="gray" dimColor>
          j/k: scroll
        </Text>
        <Text color="gray" dimColor>
          t: toggle CoT
        </Text>
      </Box>
    </Box>
  );
}
