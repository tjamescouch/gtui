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
  const streamingIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const readyRef = useRef(false);
  const pendingPromptRef = useRef<string | null>(null);

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
    } else if (event.type === "tool_call") {
      setMessages((prev) => {
        const id = streamingIdRef.current;
        if (!id) return prev;
        return prev.map((m) =>
          m.id === id
            ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name, snippet: event.snippet }] }
            : m
        );
      });
    } else if (event.type === "api_usage") {
      setUsage({
        inputTokens: event.input_tokens,
        outputTokens: event.output_tokens,
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

  /** Start the persistent gro process in interactive mode. */
  const startProcess = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const args = ["-i", "--output-format", "stream-json", "--bash"];
    if (options.model) {
      args.push("--model", options.model);
    }
    if (options.provider) {
      args.push("--provider", options.provider);
    }

    const proc = spawn("gro", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    procRef.current = proc;

    proc.stdout?.on("data", (chunk: Buffer) => {
      bufferRef.current += chunk.toString();
      const lines = bufferRef.current.split("\n");
      bufferRef.current = lines.pop() ?? "";
      for (const line of lines) {
        processLine(line);
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      // Detect readline prompt (with ANSI codes stripped)
      const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
      if (/you > /m.test(stripped)) {
        if (!readyRef.current) {
          // First prompt — process is ready to accept input
          readyRef.current = true;
          if (pendingPromptRef.current && proc.stdin?.writable) {
            proc.stdin.write(pendingPromptRef.current + "\n");
            pendingPromptRef.current = null;
          }
        } else if (streamingIdRef.current) {
          // Subsequent prompts — response complete
          if (bufferRef.current.trim()) {
            processLine(bufferRef.current);
            bufferRef.current = "";
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, isStreaming: false }
                : m
            )
          );
          streamingIdRef.current = null;
          setIsStreaming(false);
        }
      }
    });

    proc.on("close", (code) => {
      if (bufferRef.current.trim()) {
        processLine(bufferRef.current);
        bufferRef.current = "";
      }

      if (streamingIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: m.content || `[gro exited with code ${code}]`, isStreaming: false }
              : m
          )
        );
        streamingIdRef.current = null;
        setIsStreaming(false);
      }

      procRef.current = null;
      startedRef.current = false;
    });

    proc.on("error", (err) => {
      if (streamingIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: `[Error: ${err.message}]`, isStreaming: false }
              : m
          )
        );
        streamingIdRef.current = null;
        setIsStreaming(false);
      }
      procRef.current = null;
      startedRef.current = false;
    });
  }, [options.model, options.provider, processLine]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (procRef.current) {
        procRef.current.kill();
        procRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (isStreaming) return;

      // Start persistent process on first message
      if (!startedRef.current) {
        startProcess();
      }

      const userMsg: Message = {
        id: makeId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

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

      // Write prompt to the persistent process stdin, or queue if not ready
      if (readyRef.current && procRef.current?.stdin?.writable) {
        procRef.current.stdin.write(text + "\n");
      } else {
        pendingPromptRef.current = text;
      }
    },
    [isStreaming, startProcess]
  );

  const clearMessages = useCallback(() => {
    if (procRef.current) {
      procRef.current.kill();
      procRef.current = null;
    }
    setMessages([]);
    setIsStreaming(false);
    streamingIdRef.current = null;
    startedRef.current = false;
    readyRef.current = false;
    pendingPromptRef.current = null;
  }, []);

  return { messages, isStreaming, usage, sendMessage, clearMessages };
}
