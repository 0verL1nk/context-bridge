import fs from "fs";
import { execSync } from "child_process";
import path from "path";
// import { ContextBridgePayload, FileContext } from "@context-bridge/protocol"; // Pending linking

// Helper: Naive summarizer (fallback when AI is offline)
function summarizeFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length <= 50) return content; // Small files kept full
    
    // Keep header (imports/comments) and footer
    const head = lines.slice(0, 20).join("\n");
    const tail = lines.slice(-10).join("\n");
    return `${head}\n\n... [${lines.length - 30} lines hidden by Context Bridge] ...\n\n${tail}`;
  } catch (e) {
    return `[Error reading file: ${e}]`;
  }
}

export async function captureCommand(options: { output: string }) {
  console.log("📸 Capturing context with curation...");

  // 1. Get Git Info
  let gitSummary = "Not a git repo";
  let activeFilesList: string[] = [];
  try {
    const isRepo = execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    // Get modified files only (highest relevance)
    const statusOutput = execSync("git status --short").toString().trim();
    gitSummary = statusOutput;
    
    activeFilesList = statusOutput.split("\n")
      .map(line => line.trim().split(" ").pop())
      .filter((f): f is string => !!f);
      
  } catch (e) {
    // ignore
  }

  // 2. Build Active Context
  const activeContext = activeFilesList.map((f) => {
    // Only capture source files
    if (!f.match(/\.(ts|js|py|json|md)$/)) return null;
    
    return {
      type: "file",
      path: f,
      content: summarizeFile(f),
      relevance: 1.0,
      compression: "snippet"
    };
  }).filter(Boolean);

  // 3. Build Payload
  const payload = {
    schemaVersion: "1.0.0",
    sessionId: process.env.SESSION_ID || "unknown",
    timestamp: new Date().toISOString(),
    agent: {
      name: "OpenClaw CLI (Manual Curation)",
    },
    activeContext,
    decisionLog: [], // Empty for now
    constraints: [],
    gitSummary
  };

  // 4. Write
  fs.writeFileSync(options.output, JSON.stringify(payload, null, 2));
  console.log(`✅ Curated context saved to ${options.output} (${activeContext.length} files included)`);
}
