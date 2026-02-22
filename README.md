

# gtui 👾

<img width="464" height="387" alt="Screenshot 2026-02-22 at 5 09 07 AM" src="https://github.com/user-attachments/assets/8dc50476-1a60-4f71-86b9-7308dc46709b" />


**gtui** is the high-performance Terminal User Interface (TUI) for **[gro](https://www.google.com/search?q=https://github.com/tjamescouch/gro)**. It provides a dedicated, low-latency environment for managing autonomous agents, monitoring tool execution, and visualizing the "Virtual Memory" systems of your LLM runtime.

*Visualizing the context: Persistent agents in a dark-mode world.*

## Features

* **Real-time Stream Monitoring:** View live token generation and tool calls with the high-fidelity logging you expect from `gro --verbose`.
* **Dynamic Context Visualization:** Track active memory pages, importance weights, and "Virtual Memory" state in a clean, terminal-native layout.
* **Provider Switching:** Fast-toggle between Anthropic, OpenAI, xAI, and local models.
* **Resource Intensity Control:** Visual feedback for the `@@thinking(0.0-1.0)@@` lever—see exactly how much compute your agent is burning.
* **MCP Integration:** A dedicated panel for connected MCP servers and available tools.



## Installation

```bash
# Clone the repo
git clone https://github.com/tjamescouch/gtui.git
cd gtui

# Install dependencies
npm install

# Link for global usage
npm link

```

## Usage

Launch `gtui` to wrap your existing `gro` sessions:

```bash
gtui --model grok-fast

```

### Keybindings

* `Ctrl + T`: Toggle thinking intensity
* `Ctrl + M`: Cycle memory modes (Virtual/HNSW/Fragment)
* `Ctrl + L`: Clear active viewport
* `Tab`: Switch between chat and tool-logs

## Architecture

`gtui` is built to be as efficient as the runtime it manages. It utilizes:

* **[Blessed](https://github.com/chjj/blessed) / [Ink](https://github.com/vadimdemedes/ink):** For the terminal rendering engine.
* **Unix Domain Sockets / IPC:** For zero-latency communication with the `gro` background process.
* **Metal Performance Shaders (MPS):** (Experimental) Local visualization hooks for Mac Studio.

## License

[MIT](https://www.google.com/search?q=LICENSE) — Part of the **Pattern Persistence Project**.


