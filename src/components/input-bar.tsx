import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { VimMode } from "../types.js";

interface InputBarProps {
  onSubmit: (text: string) => void;
  onScroll?: (delta: number) => void;
  isStreaming: boolean;
  mode: VimMode;
  isFocused: boolean;
}

export function InputBar({ onSubmit, onScroll, isStreaming, mode, isFocused }: InputBarProps) {
  const [value, setValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef("");

  // Keep ref in sync for async access in timeout callback
  useEffect(() => { valueRef.current = value; }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  const handleInput = useCallback(
    (input: string, key: {
      return?: boolean;
      backspace?: boolean;
      delete?: boolean;
      leftArrow?: boolean;
      rightArrow?: boolean;
      escape?: boolean;
      tab?: boolean;
      ctrl?: boolean;
    }) => {
      if (mode !== "insert" || !isFocused) return;

      // Intercept Ctrl+j/k/d/u for scrolling before character input
      if (key.ctrl && onScroll) {
        if (input === "j") { onScroll(1); return; }
        if (input === "k") { onScroll(-1); return; }
        if (input === "d") { onScroll(10); return; }
        if (input === "u") { onScroll(-10); return; }
      }

      if (key.return) {
        if (submitTimerRef.current) {
          // Paste continuation — insert newline into value
          clearTimeout(submitTimerRef.current);
          setValue((v) => v.slice(0, cursorPos) + "\n" + v.slice(cursorPos));
          setCursorPos((p) => p + 1);
        }
        submitTimerRef.current = setTimeout(() => {
          submitTimerRef.current = null;
          const trimmed = valueRef.current.trim();
          if (trimmed && !isStreaming) {
            onSubmit(trimmed);
            setValue("");
            setCursorPos(0);
          }
        }, 50);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          setValue((v) => v.slice(0, cursorPos - 1) + v.slice(cursorPos));
          setCursorPos((p) => p - 1);
        }
        return;
      }

      if (key.leftArrow) {
        setCursorPos((p) => Math.max(0, p - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPos((p) => Math.min(value.length, p + 1));
        return;
      }

      // Ignore control keys handled elsewhere
      if (key.escape || key.tab) return;

      // Regular character input
      if (input && !key.return) {
        setValue((v) => v.slice(0, cursorPos) + input + v.slice(cursorPos));
        setCursorPos((p) => p + input.length);
        // If paste timer is active, reset it (more input arriving during paste)
        if (submitTimerRef.current) {
          clearTimeout(submitTimerRef.current);
          submitTimerRef.current = setTimeout(() => {
            submitTimerRef.current = null;
            const trimmed = valueRef.current.trim();
            if (trimmed && !isStreaming) {
              onSubmit(trimmed);
              setValue("");
              setCursorPos(0);
            }
          }, 50);
        }
      }
    },
    [mode, isFocused, value, cursorPos, isStreaming, onSubmit, onScroll]
  );

  useInput(handleInput);

  const modeIndicator = mode === "normal" ? "NORMAL" : "INSERT";
  const modeColor = mode === "normal" ? "yellow" : "green";

  const displayValue = value || (mode === "insert" ? "" : "");
  const placeholder = !value && mode === "insert" ? "Type a message..." : "";

  return (
    <Box borderStyle="single" borderColor={isFocused ? "blue" : "gray"} paddingX={1}>
      <Box marginRight={1}>
        <Text color={modeColor} bold>
          [{modeIndicator}]
        </Text>
      </Box>
      <Box flexGrow={1}>
        {value ? (
          <Text>
            {displayValue}
            {mode === "insert" && <Text color="yellow">█</Text>}
          </Text>
        ) : (
          <Text color="gray">
            {placeholder}
            {mode === "insert" && <Text color="yellow">█</Text>}
          </Text>
        )}
      </Box>
      {isStreaming && (
        <Box marginLeft={1}>
          <Text color="yellow">streaming...</Text>
        </Box>
      )}
    </Box>
  );
}
