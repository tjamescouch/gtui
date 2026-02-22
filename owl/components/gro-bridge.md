# gro-bridge

integration layer between the tui and gro runtime.

## state

- active gro session (provider, model, memory mode)
- conversation history managed by gro's memory system
- available providers and models

## capabilities

- start a gro session with a given provider and model
- send user messages and receive streamed responses
- switch models mid-conversation
- list available providers and their models
- expose token usage and cost from gro responses
- manage session persistence (save/load conversations)

## interfaces

exposes:
- session lifecycle (create, send, switch-model, close)
- streaming response events (token, done, error)
- session metadata (model, provider, token counts)

depends on:
- @tjamescouch/gro package or gro subprocess

## invariants

- one active session at a time
- session state survives model switches
- errors from gro are surfaced to the tui, never swallowed
