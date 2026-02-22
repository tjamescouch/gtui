#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./app.js";

function parseArgs(argv: string[]): { model?: string; provider?: string; showThinking?: boolean } {
  const args: { model?: string; provider?: string; showThinking?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--model" && argv[i + 1]) {
      args.model = argv[++i];
    } else if (argv[i] === "--provider" && argv[i + 1]) {
      args.provider = argv[++i];
    } else if (argv[i] === "--show-thinking" || argv[i] === "--thinking") {
      args.showThinking = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

render(
  <App model={args.model} provider={args.provider} showThinking={args.showThinking} />,
  { exitOnCtrlC: true }
);
