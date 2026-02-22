import { useState, useCallback, useRef, useEffect } from "react";
import { spawn, type ChildProcess } from "node:child_process";
import type { Message, GroEvent, Usage } from "../types.js";

interface UseGroOptions {
  model?: string;
  provider?: string;
}

interface UseGroReturn {
  messages: Message[];
  isStreaming: boolean;
  usage: Usage;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

let nextId = 0;
function makeId(): string {
  return `msg-${Date.now()}-${nextId++}`;
}

export function useGro(options: UseGroOptions = {}): UseGroReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usage, setUsage] = useState<Usage>({ inputTokens: 0, outputTokens: 0 });
  const procRef = useRef<ChildProcess | null>(null);
  const bufferRef = useRef("");
  const stderrRef = useRef("");
  const streamingIdRef = useRef<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (procRef.current) {
        procRef.current.kill();
        procRef.current = null;
      }
    };
  }, []);

  const handleEvent = useCallback((event: GroEvent) => {
    if (event.type === "token") {
      setMessages((prev) => {
        const id = streamingIdRef.current;
        if (!id) return prev;
        return prev.map((m) =>
          m.id === id ? { ...m, content: m.content + event.token } : m
        );
      });
    } else if (event.type === "reasoning") {
      setMessages((prev) => {
        const id = streamingIdRef.current;
        if (!id) return prev;
        return prev.map((m) =>
          m.id === id ? { ...m, reasoning: (m.reasoning ?? "") + event.token } : m
        );
      });
    } else if (event.type === "result") {
      const id = streamingIdRef.current;
      if (id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, content: event.result, isStreaming: false } : m
          )
        );
      }
      streamingIdRef.current = null;
      setIsStreaming(false);
      procRef.current = null;
    }
  }, []);

  const processLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const event = JSON.parse(trimmed) as GroEvent;
        handleEvent(event);
      } catch {
        // Non-JSON output from gro, ignore
      }
    },
    [handleEvent]
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (isStreaming) return;

      // Add user message
      const userMsg: Message = {
        id: makeId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      // Add placeholder assistant message
      const assistantId = makeId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      streamingIdRef.current = assistantId;
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      bufferRef.current = "";

      // Build gro command args
      const args = ["--output-format", "stream-json"];
      if (options.model) {
        args.push("--model", options.model);
      }
      if (options.provider) {
        args.push("--provider", options.provider);
      }
      args.push(text);

      const proc = spawn("gro", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });

      procRef.current = proc;

      proc.stdout?.on("data", (chunk: Buffer) => {
        bufferRef.current += chunk.toString();
        const lines = bufferRef.current.split("\n");
        // Keep the last incomplete line in the buffer
        bufferRef.current = lines.pop() ?? "";
        for (const line of lines) {
          processLine(line);
        }
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        stderrRef.current += chunk.toString();
      });

      proc.on("close", (code) => {
        // Process any remaining buffer
        if (bufferRef.current.trim()) {
          processLine(bufferRef.current);
          bufferRef.current = "";
        }

        if (streamingIdRef.current) {
          if (code !== 0) {
            // Extract a useful error from stderr
            const errLines = stderrRef.current.trim().split("\n");
            const errMsg = errLines.find((l) => l.includes("error:")) || errLines[errLines.length - 1] || `gro exited with code ${code}`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? {
                      ...m,
                      content: m.content || `[${errMsg.replace(/\x1b\[[0-9;]*m/g, "").trim()}]`,
                      isStreaming: false,
                    }
                  : m
              )
            );
          } else {
            // Successful exit — finalize the streaming message with accumulated tokens
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
          }
          streamingIdRef.current = null;
          setIsStreaming(false);
        }

        stderrRef.current = "";
        procRef.current = null;
      });

      proc.on("error", (err) => {
        if (streamingIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? {
                    ...m,
                    content: `[Error: ${err.message}]`,
                    isStreaming: false,
                  }
                : m
            )
          );
          streamingIdRef.current = null;
          setIsStreaming(false);
        }
        procRef.current = null;
      });
    },
    [isStreaming, options.model, options.provider, processLine]
  );

  const clearMessages = useCallback(() => {
    if (procRef.current) {
      procRef.current.kill();
      procRef.current = null;
    }
    setMessages([]);
    setIsStreaming(false);
    streamingIdRef.current = null;
  }, []);

  return { messages, isStreaming, usage, sendMessage, clearMessages };
}
