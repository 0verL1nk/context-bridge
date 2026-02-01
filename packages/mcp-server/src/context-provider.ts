import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { ContextBridgePayload, FileContext } from "@context-bridge/protocol";

// Adjust these paths based on OpenClaw's workspace structure
const WORKSPACE_ROOT = process.cwd(); // Assuming server runs from workspace root
// Fix: MEMORY_DIR should be relative to workspace root, but if we run from projects/context-bridge, we need to go up.
// Better strategy: Look for 'memory' dir in CWD, if not found, try parent directories.
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

export function getRealContext(): ContextBridgePayload {
    const activeContext: any[] = []; // Using any temporarily to bypass strict union checks during push

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

    // 4. Capture Chat History
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
        try {
            const content = fs.readFileSync(CHAT_HISTORY_FILE, "utf-8");
            // Validate JSON
            JSON.parse(content); 
            activeContext.push({
                type: "file",
                path: "memory/chat_history.json",
                content: summarizeFile(content, 100),
                compression: "full", // Chat history is critical, keep more if possible
                relevance: 1.0,
                note: "Recent conversation history"
            });
        } catch (e) {
            // Ignore invalid JSON
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
        decisionLog: [], // TODO: Parse from chat history if available
        constraints: ["Ensure all code changes are verified"]
    };
}
