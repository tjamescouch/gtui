import { useState, useCallback } from "react";
import { useInput } from "ink";
import type { VimMode, Panel } from "../types.js";

interface UseVimKeysOptions {
  onQuit: () => void;
  onScroll: (delta: number) => void;
  onToggleThinking?: () => void;
  onToggleTools?: () => void;
  onSubmit?: (text: string) => void;
  isStreaming?: boolean;
}

interface UseVimKeysReturn {
  mode: VimMode;
  activePanel: Panel;
  setMode: (mode: VimMode) => void;
}

export function useVimKeys(options: UseVimKeysOptions): UseVimKeysReturn {
  const [mode, setMode] = useState<VimMode>("insert");
  const [activePanel, setActivePanel] = useState<Panel>("chat");

  const handleInput = useCallback(
    (input: string, key: { escape?: boolean; tab?: boolean; ctrl?: boolean }) => {
      // Ctrl+j/k and Ctrl+d/u work in BOTH modes
      if (key.ctrl) {
        if (input === "j") { options.onScroll(1); return; }
        if (input === "k") { options.onScroll(-1); return; }
        if (input === "d") { options.onScroll(10); return; }
        if (input === "u") { options.onScroll(-10); return; }
      }

      if (mode === "normal") {
        switch (input) {
          case "q":
            options.onQuit();
            return;
          case "j":
            options.onScroll(1);
            return;
          case "k":
            options.onScroll(-1);
            return;
          case "G":
            // Scroll to bottom
            options.onScroll(Infinity);
            return;
          case "g":
            // Scroll to top
            options.onScroll(-Infinity);
            return;
          case "i":
            setMode("insert");
            return;
          case "a":
            setMode("insert");
            return;
          case "t":
            options.onToggleThinking?.();
            return;
          case "s":
            options.onToggleTools?.();
            return;
        }

        if (key.tab) {
          setActivePanel((prev) => (prev === "chat" ? "sidebar" : "chat"));
          return;
        }
      }

      if (mode === "insert") {
        if (key.escape) {
          setMode("normal");
          return;
        }
      }
    },
    [mode, options]
  );

  useInput(handleInput);

  return { mode, activePanel, setMode };
}
