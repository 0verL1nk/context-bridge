# Context Bridge CLI

This is the command-line interface for the Context Bridge project.

## Installation

1. Install dependencies:
   ```bash
   cd packages/cli
   npm install
   ```

2. Build:
   ```bash
   npm run build
   ```

## Usage

### Capture Context

Saves the current Git status and a skeleton Context Bridge JSON to a file.

```bash
# Default output: context.json
node dist/index.js capture

# Custom output
node dist/index.js capture -o my-context.json
```

### Dump Context

Reads a context file and prints a human-readable summary.

```bash
node dist/index.js dump my-context.json
```
