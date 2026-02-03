#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ContextBridgePayload } from "@context-bridge/protocol";
import { getRealContext } from "./context-provider.js";

// Initialize server
const server = new Server(
  {
    name: "context-bridge-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
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
        description: "The most recent context state captured by the bridge (Real-time)",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "context://latest") {
    try {
      const payload = getRealContext();
      return {
        contents: [
          {
            uri: "context://latest",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (e) {
      throw new Error(`Failed to capture context: ${e}`);
    }
  }
  throw new Error("Resource not found");
});

// --- Prompts ---

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "summarize_context",
        description: "Generate a summary of the current context state",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "summarize_context") {
    const payload = getRealContext();
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please summarize the current context:\n\n${JSON.stringify(payload, null, 2)}`
          },
        },
      ],
    };
  }
  throw new Error("Prompt not found");
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
      {
        name: "search_context",
        description: "Search active files and decision logs for keywords",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term" },
          },
          required: ["query"],
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

  if (request.params.name === "search_context") {
    const { query } = request.params.arguments as { query: string };
    const context = getRealContext();
    const results = [];

    // Search Files
    for (const item of context.activeContext) {
        if (item.type === "file" && (item.path.includes(query) || (item.content && item.content.includes(query)))) {
            results.push(`[FILE] ${item.path}`);
        }
    }

    // Search Decisions
    for (const decision of context.decisionLog) {
        if (decision.question.includes(query) || decision.options.some(o => o.description.includes(query))) {
            results.push(`[DECISION] ${decision.question} -> ${decision.selectedOptionId}`);
        }
    }

    return {
      content: [{ 
          type: "text", 
          text: results.length > 0 ? results.join("\n") : "No matches found." 
      }],
    };
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
