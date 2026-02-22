# constraints

## stack

- language: typescript, strict mode
- runtime: node
- tui framework: ink (react for CLIs) or blessed
- no web server: this is a pure terminal application
- gro is consumed as an npm package (@tjamescouch/gro) or spawned as a subprocess

## style

- minimal dependencies
- single binary via npm bin
- responsive to terminal resize
- supports 256-color terminals

## keybindings

- vim-style navigation (h/j/k/l)
- tab to switch panels
- q to quit
- / to search
