import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ContextBridgePayload } from "@context-bridge/protocol";
import * as path from "path";

// 1. Setup Transport (Connect to local MCP Server)
const serverPath = path.resolve("packages/mcp-server/dist/index.js");
console.log(`🔌 Connecting to MCP Server at: ${serverPath}`);

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
});

const client = new Client(
  {
    name: "integration-test-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

async function run() {
  try {
    // 2. Connect
    await client.connect(transport);
    console.log("✅ Connected to MCP Server");

    // 3. List Resources
    const resources = await client.listResources();
    console.log("📂 Found Resources:", resources.resources.map(r => r.uri));
    
    if (!resources.resources.find(r => r.uri === "context://latest")) {
      throw new Error("Missing context://latest resource");
    }

    // 4. Read Context
    console.log("📥 Reading context://latest...");
    const result = await client.readResource({ uri: "context://latest" });
    const content = result.contents[0];
    
    if (content.mimeType !== "application/json") {
        throw new Error(`Unexpected MIME type: ${content.mimeType}`);
    }

    // 5. Validate Payload
    const payload = JSON.parse(content.text);
    console.log("🔍 Validating Payload Schema...");
    
    // Use Zod to validate (Integration Check)
    // Note: We are importing from source but validation logic is bundled in the server usually.
    // Here we just check basic structure.
    if (payload.schemaVersion !== "1.0.0") throw new Error("Invalid schema version");
    if (!Array.isArray(payload.activeContext)) throw new Error("Missing activeContext");
    
    console.log("✅ Payload Validated!");
    console.log(`📊 Active Context Items: ${payload.activeContext.length}`);
    payload.activeContext.forEach(item => {
        console.log(`   - [${item.type}] ${item.path} (${item.compression})`);
    });

    // 6. Test Tool (Validation)
    console.log("🛠️ Testing Tool: validate_context...");
    const toolResult = await client.callTool({
        name: "validate_context",
        arguments: {
            json: JSON.stringify(payload)
        }
    });
    
    if (toolResult.isError) {
        throw new Error(`Tool validation failed: ${JSON.stringify(toolResult.content)}`);
    }
    console.log("✅ Tool Execution Successful:", toolResult.content[0].text);

  } catch (error) {
    console.error("❌ Integration Test Failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await client.close(); 
  }
}

run();
