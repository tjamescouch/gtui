# tui

the terminal user interface. renders panels, handles input, displays conversation.

## state

- current conversation messages
- active panel (chat, sessions, settings)
- input buffer
- scroll position per panel
- streaming response in progress

## capabilities

- multi-panel layout: chat area, input bar, sidebar
- stream LLM responses token-by-token into the chat panel
- scroll through conversation history
- switch between saved sessions
- select model and provider from settings panel
- display token usage and cost
- show thinking/reasoning blocks collapsible
- render markdown in responses (code blocks, bold, lists)
- copy response text to clipboard

## interfaces

depends on:
- gro-bridge component for all LLM interactions

## invariants

- input is always visible at the bottom
- streaming text appears incrementally, never blocks input
- terminal state is fully restored on exit
- handles terminal resize gracefully
