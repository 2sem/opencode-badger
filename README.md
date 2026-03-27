# opencode-badger

An [OpenCode](https://opencode.ai) plugin that notifies you when the AI finishes — via a terminal tab indicator and a macOS dock badge.

Inspired by Claude Code's behavior of showing a notification icon on the terminal tab and a badge on the dock icon when it finishes a task.

## What it does

When OpenCode finishes a session (`session.idle`):

1. **Terminal tab notification** — sends a BEL character (`\x07`) to make the terminal tab show a notification dot
2. **Dock icon bounce** — the terminal's dock icon bounces when it is in the background
3. **macOS notification** — delivers a native notification via `osascript`, which increments the dock badge counter if enabled

## Installation

### Global (works in any project)

```bash
mkdir -p ~/.config/opencode/plugins
curl -o ~/.config/opencode/plugins/terminal-notify.js \
  https://raw.githubusercontent.com/2sem/opencode-badger/main/.opencode/plugins/terminal-notify.js
```

### Project-level

Copy the plugin into your project:

```bash
mkdir -p .opencode/plugins
curl -o .opencode/plugins/terminal-notify.js \
  https://raw.githubusercontent.com/2sem/opencode-badger/main/.opencode/plugins/terminal-notify.js
```

OpenCode automatically loads any `.js` files found in `.opencode/plugins/` or `~/.config/opencode/plugins/` — no config changes needed.

## Enable dock badge (one-time macOS setup)

1. Open **System Settings → Notifications → Terminal** (or iTerm2)
2. Toggle on **"Badge app icon"**

After this, every time OpenCode finishes, the terminal's dock icon shows a numeric badge.

## Requirements

- macOS
- [OpenCode](https://opencode.ai) (uses Bun internally — no extra dependencies)
- Terminal.app or iTerm2

## How it works

```
session.idle
  ├── process.stdout.write("\x07")   → tab notification dot + dock bounce
  └── osascript display notification → macOS notification + dock badge count
```

## License

MIT
