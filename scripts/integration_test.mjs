import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ContextBridgePayload } from "@context-bridge/protocol";
import * as path from "path";

// 1. Setup Transport (Connect to local MCP Server)
// Resolve absolute path to server BEFORE changing cwd
const serverPath = path.resolve(import.meta.dirname, "../packages/mcp-server/dist/index.js");

// Allow changing CWD via argument
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
if (process.argv[2]) {
    console.log(`📂 Switching context to: ${targetDir}`);
    process.chdir(targetDir);
}

console.log(`🔌 Connecting to MCP Server at: ${serverPath}`);

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  // Server inherits current CWD
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

    console.log(`🧠 Decision Log Items: ${payload.decisionLog.length}`);
    payload.decisionLog.forEach(d => {
        console.log(`   - [Decision] ${d.options[0].description}`);
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
