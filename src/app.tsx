import React, { useState, useCallback, useRef } from "react";
import { Box, useApp, useStdout } from "ink";
import { ChatPanel } from "./components/chat-panel.js";
import { InputBar } from "./components/input-bar.js";
import { Sidebar } from "./components/sidebar.js";
import { StatusBar } from "./components/status-bar.js";
import { useGro } from "./hooks/use-gro.js";
import { useVimKeys } from "./hooks/use-vim-keys.js";

interface AppProps {
  model?: string;
  provider?: string;
  showThinking?: boolean;
}

export function App({ model, provider, showThinking: initialShowThinking }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;

  const [scrollOffset, setScrollOffset] = useState(Infinity); // start at bottom
  const [showThinking, setShowThinking] = useState(initialShowThinking ?? false);
  const [showTools, setShowTools] = useState(false);
  const userScrolledRef = useRef(false);
  const { messages, isStreaming, usage, sendMessage } = useGro({
    model,
    provider,
  });

  const handleScroll = useCallback((delta: number) => {
    userScrolledRef.current = true;
    setScrollOffset((prev) => {
      if (delta === Infinity) return Infinity;
      if (delta === -Infinity) return 0;
      return Math.max(0, prev === Infinity ? 99999 + delta : prev + delta);
    });
  }, []);

  const handleQuit = useCallback(() => {
    exit();
  }, [exit]);

  const toggleThinking = useCallback(() => {
    setShowThinking((prev) => !prev);
  }, []);

  const toggleTools = useCallback(() => {
    setShowTools((prev) => !prev);
  }, []);

  const { mode, activePanel, setMode } = useVimKeys({
    onQuit: handleQuit,
    onScroll: handleScroll,
    onToggleThinking: toggleThinking,
    onToggleTools: toggleTools,
    isStreaming,
  });

  const handleSubmit = useCallback(
    (text: string) => {
      sendMessage(text);
      userScrolledRef.current = false;
      setScrollOffset(Infinity); // auto-scroll to bottom on send
    },
    [sendMessage]
  );

  // Auto-scroll to bottom when streaming, but only if user hasn't manually scrolled
  React.useEffect(() => {
    if (isStreaming && !userScrolledRef.current) {
      setScrollOffset(Infinity);
    }
  }, [isStreaming, messages]);

  const chatHeight = termHeight - 5; // status bar + input bar + borders

  return (
    <Box flexDirection="column" height={termHeight}>
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar
          sessions={[]}
          activeSessionId={null}
          model={model ?? ""}
          provider={provider ?? ""}
          isFocused={activePanel === "sidebar"}
        />
        <Box flexDirection="column" flexGrow={1}>
          <ChatPanel
            messages={messages}
            scrollOffset={scrollOffset === Infinity ? 99999 : scrollOffset}
            height={chatHeight}
            isFocused={activePanel === "chat"}
            showThinking={showThinking}
            showTools={showTools}
          />
          <InputBar
            onSubmit={handleSubmit}
            onScroll={handleScroll}
            isStreaming={isStreaming}
            mode={mode}
            isFocused={activePanel === "chat"}
          />
        </Box>
      </Box>
      <StatusBar
        model={model ?? ""}
        provider={provider ?? ""}
        usage={usage}
        mode={mode}
        messageCount={messages.filter((m) => m.role === "user").length}
      />
    </Box>
  );
}
