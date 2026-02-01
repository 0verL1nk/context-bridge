# Context Bridge

**Industrial-grade Context Bridge for OpenClaw.**

This monorepo contains the reference implementation of the Context Bridge protocol, enabling seamless context sharing between OpenClaw agents and external tools/environments.

## 🏗 Architecture

Managed via [Turborepo](https://turbo.build/), structured as follows:

- **`packages/protocol`**: Core TypeScript definitions and Zod schemas for the context-bridge protocol.
- **`packages/cli`**: Command-line interface for capturing, dumping, and inspecting context states.
- **`packages/mcp-server`**: (In Progress) Model Context Protocol (MCP) server implementation for bridge access.
- **`packages/openclaw-skill`**: (Planned) Native skill for OpenClaw agents to consume the bridge.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build
```

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@context-bridge/protocol` | Core schemas and types | 0.1.0 |
| `@context-bridge/cli` | CLI tools | 0.1.0 |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT
