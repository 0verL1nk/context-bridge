# Context Bridge

**The "Infinite Context" Backbone for Autonomous Agent Swarms.**

Context Bridge is an industrial-grade **Model Context Protocol (MCP)** server that acts as a "Hive Mind" for OpenClaw agents. It decouples context management from prompt engineering, allowing agents to pull real-time, structured context (code, memory, decisions) on demand.

## 🌟 Why Context Bridge?

- **📉 Zero-Token Overhead**: Don't stuff 100 files into your prompt. Give the agent a "library card" (MCP connection) instead.
- **🔄 Real-Time Sync**: Agents see the *current* state of the repo, not a stale snapshot from 10 minutes ago.
- **🧠 Hybrid Memory**: Intelligently fuses **Hot Context** (Git working tree), **Warm Context** (Sliding window chat), and **Cold Context** (Summarized decisions).
- **🌍 Universal Access**: Works in Git repos, plain folders, or even empty directories.

## 🏗 Architecture

Managed via [Turborepo](https://turbo.build/):

- **`packages/protocol`**: Zod-validated schemas defining the Context Bridge data shape.
- **`packages/mcp-server`**: The core MCP server. Exposes `context://latest` resource.
  - *Features*: Git-aware, FS fallback, Decision Mining.
- **`packages/cli`**: Utilities for manual inspection (`capture`, `dump`).

## 🚀 Quick Start

### 1. Start the Bridge
```bash
# In the root of your workspace
cd projects/context-bridge
npm start
```

### 2. Connect an Agent (OpenClaw)
In your `sessions_spawn` call:
```javascript
sessions_spawn({
  task: "Fix the bug in src/index.ts",
  prompt: "Use the 'context-bridge' MCP tool to fetch the current project state."
})
```

## 🧠 Context Strategy

Context Bridge uses a **Tiered Context Model**:

| Tier | Source | Latency | Description |
|------|--------|---------|-------------|
| **Hot** | `git status` / `fs.watch` | <100ms | Modified files, unstaged changes. |
| **Warm** | `chat_history.json` | <200ms | Last 10 conversation turns. |
| **Cold** | `MEMORY.md` | <500ms | Long-term directives and architectural decisions. |
| **Frozen** | `DecisionLog` | Lazy | Key decisions extracted from evicted chat history. |

## 📦 Packages

| Package | Version | Status |
|---------|---------|--------|
| `@context-bridge/protocol` | 0.1.0 | ✅ Stable |
| `@context-bridge/mcp-server` | 0.1.0 | ✅ Active |
| `@context-bridge/cli` | 0.1.0 | 🚧 Beta |

## 📄 License

MIT
