#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ContextBridgePayload } from "@context-bridge/protocol";

// Initialize server
const server = new Server(
  {
    name: "context-bridge-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// --- Resources ---

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "context://latest",
        name: "Latest Context Snapshot",
        mimeType: "application/json",
        description: "The most recent context state captured by the bridge",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "context://latest") {
    // DUMMY DATA FOR NOW
    const payload: ContextBridgePayload = {
      schemaVersion: "1.0.0",
      sessionId: "session-123",
      timestamp: new Date().toISOString(),
      agent: {
        name: "OpenClaw-Main",
        model: "gpt-4",
      },
      activeContext: [
        {
          type: "file",
          path: "src/index.ts",
          compression: "full",
          relevance: 1.0,
          note: "Entry point",
        },
      ],
      decisionLog: [],
      constraints: ["Do not use floating point arithmetic"],
    };

    return {
      contents: [
        {
          uri: "context://latest",
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }
  throw new Error("Resource not found");
});

// --- Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "validate_context",
        description: "Validate a JSON object against the Context Bridge Protocol",
        inputSchema: {
          type: "object",
          properties: {
            json: { type: "string", description: "JSON string to validate" },
          },
          required: ["json"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "validate_context") {
    const { json } = request.params.arguments as { json: string };
    try {
      const obj = JSON.parse(json);
      ContextBridgePayload.parse(obj);
      return {
        content: [{ type: "text", text: "✅ Valid Context Bridge Payload" }],
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return {
          content: [{ type: "text", text: `❌ Validation Failed:\n${JSON.stringify(err.errors, null, 2)}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `❌ Error: ${err}` }],
        isError: true,
      };
    }
  }
  throw new Error("Tool not found");
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
