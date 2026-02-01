import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { ContextBridgePayload, FileContext } from "@context-bridge/protocol";

// Adjust these paths based on OpenClaw's workspace structure
const WORKSPACE_ROOT = process.cwd(); // Assuming server runs from workspace root

function findMemoryDir(startDir: string): string {
    let current = startDir;
    for (let i = 0; i < 3; i++) {
        const check = path.join(current, "memory");
        if (fs.existsSync(check)) return check;
        current = path.dirname(current);
    }
    return path.join(startDir, "memory"); // Fallback
}

const MEMORY_DIR = findMemoryDir(WORKSPACE_ROOT);
const MEMORY_FILE = path.join(path.dirname(MEMORY_DIR), "MEMORY.md");
const CHAT_HISTORY_FILE = path.join(MEMORY_DIR, "chat_history.json");

function getDailyMemoryFile(): string | null {
    const today = new Date().toISOString().split("T")[0];
    const file = path.join(MEMORY_DIR, `${today}.md`);
    return fs.existsSync(file) ? file : null;
}

function summarizeFile(content: string, maxLines = 50): string {
    const lines = content.split("\n");
    if (lines.length <= maxLines) return content;
    const head = lines.slice(0, 20).join("\n");
    const tail = lines.slice(-10).join("\n");
    return `${head}\n\n... [${lines.length - 30} lines hidden by Context Bridge] ...\n\n${tail}`;
}

// Helper: Heuristic Decision Extraction
function extractKeyDecisions(messages: any[]): any[] {
    const decisions: any[] = [];
    // Keywords implying a decision, plan, or consensus
    const KEYWORDS = ["决定", "方案", "plan", "consensus", "decision", "selected", "chosen", "agree", "fix", "implement"];
    
    messages.forEach((msg, index) => {
        if (msg.role === "assistant" || msg.role === "user") {
            const content = msg.content?.toLowerCase() || "";
            // Heuristic: If message contains keywords and is not too long (avoiding huge dumps)
            if (KEYWORDS.some(kw => content.includes(kw)) && content.length < 500) {
                decisions.push({
                    id: `decision-${index}`,
                    question: "Extracted from history",
                    options: [],
                    selectedOptionId: "unknown",
                    // Use the message content as the reasoning/decision trace
                    decision: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
                });
            }
        }
    });
    return decisions;
}

export function getRealContext(): ContextBridgePayload {
    const activeContext: any[] = []; // Using any temporarily to bypass strict union checks during push
    let decisionLog: any[] = [];

    // 1. Capture Git Status (Modified Files)
    try {
        const statusOutput = execSync("git status --short", { encoding: "utf-8", cwd: WORKSPACE_ROOT });
        const modifiedFiles = statusOutput.split("\n")
            .map(line => line.trim().split(" ").pop())
            .filter((f): f is string => !!f && !f.startsWith(".."));

        for (const file of modifiedFiles) {
             // Only capture text files
             if (!file.match(/\.(ts|js|py|json|md|txt|yml)$/)) continue;
             
             const fullPath = path.join(WORKSPACE_ROOT, file);
             if (fs.existsSync(fullPath)) {
                 const content = fs.readFileSync(fullPath, "utf-8");
                 activeContext.push({
                     type: "file",
                     path: file,
                     content: summarizeFile(content),
                     compression: "snippet",
                     relevance: 1.0,
                     note: "Active modified file in workspace"
                 });
             }
        }
    } catch (e) {
        // Not a git repo or other error, ignore
    }

    // 2. Capture Long-term Memory
    if (fs.existsSync(MEMORY_FILE)) {
        const content = fs.readFileSync(MEMORY_FILE, "utf-8");
        activeContext.push({
            type: "file",
            path: "MEMORY.md",
            content: summarizeFile(content, 100), // Give more space to memory
            compression: "summary",
            relevance: 0.9,
            note: "Long-term memory and core directives"
        });
    }

    // 3. Capture Daily Memory
    const dailyFile = getDailyMemoryFile();
    if (dailyFile) {
        const content = fs.readFileSync(dailyFile, "utf-8");
        activeContext.push({
            type: "file",
            path: path.relative(WORKSPACE_ROOT, dailyFile),
            content: summarizeFile(content, 50),
            compression: "snippet",
            relevance: 0.8,
            note: "Today's working memory"
        });
    }

    // 4. Capture Chat History (Hybrid: Tail + Decision Extraction)
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
        try {
            const rawContent = fs.readFileSync(CHAT_HISTORY_FILE, "utf-8");
            const messages = JSON.parse(rawContent);
            
            if (Array.isArray(messages)) {
                // A. Sliding Window: Keep last 10
                const recentMessages = messages.slice(-10); 
                activeContext.push({
                    type: "file",
                    path: "memory/chat_history.json",
                    content: JSON.stringify(recentMessages, null, 2),
                    compression: "snippet",
                    relevance: 0.9,
                    note: "Recent 10 messages of conversation history"
                });

                // B. Decision Extraction: Scan older messages
                if (messages.length > 10) {
                    const olderMessages = messages.slice(0, -10);
                    const extractedDecisions = extractKeyDecisions(olderMessages);
                    if (extractedDecisions.length > 0) {
                         // Map to protocol DecisionNode format
                         decisionLog = extractedDecisions.map(d => ({
                             id: d.id,
                             question: "Historical Decision",
                             options: [{
                                 id: "opt-1",
                                 description: d.decision,
                                 status: "chosen",
                                 reasoning: "Extracted from conversation history"
                             }],
                             selectedOptionId: "opt-1"
                         }));
                    }
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }

    return {
        schemaVersion: "1.0.0",
        sessionId: process.env.SESSION_ID || "current-session",
        timestamp: new Date().toISOString(),
        agent: {
            name: "OpenClaw-Local",
            model: process.env.MODEL || "unknown"
        },
        activeContext,
        decisionLog, // Populated from history
        constraints: ["Ensure all code changes are verified"]
    };
}
