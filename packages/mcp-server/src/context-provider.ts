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

// Helper: Get recent files via FS scan (Fallback for non-git)
function getRecentFiles(dir: string, limit = 5): string[] {
    const recentFiles: { file: string; mtime: number }[] = [];
    
    function scan(currentDir: string) {
        if (recentFiles.length > 100) return; // Safety limit

        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relativePath = path.relative(dir, fullPath);

                // Ignore patterns
                if (entry.name.startsWith(".") || 
                    entry.name === "node_modules" || 
                    entry.name === "dist" ||
                    entry.name === "venv") continue;

                if (entry.isDirectory()) {
                    scan(fullPath);
                } else if (entry.isFile()) {
                    if (!entry.name.match(/\.(ts|js|py|json|md|txt|yml|html|css)$/)) continue;
                    const stats = fs.statSync(fullPath);
                    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                    if (stats.mtimeMs > oneDayAgo) {
                        recentFiles.push({ file: relativePath, mtime: stats.mtimeMs });
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }

    try {
        scan(dir);
    } catch (e) { }

    return recentFiles
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, limit)
        .map(x => x.file);
}

// Helper: Heuristic Decision Extraction
function extractKeyDecisions(messages: any[]): any[] {
    const decisions: any[] = [];
    const KEYWORDS = ["决定", "方案", "plan", "consensus", "decision", "selected", "chosen", "agree", "fix", "implement"];
    
    messages.forEach((msg, index) => {
        if (msg.role === "assistant" || msg.role === "user") {
            const content = msg.content?.toLowerCase() || "";
            if (KEYWORDS.some(kw => content.includes(kw)) && content.length < 500) {
                decisions.push({
                    id: `decision-${index}`,
                    question: "Extracted from history",
                    options: [],
                    selectedOptionId: "unknown",
                    decision: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
                });
            }
        }
    });
    return decisions;
}

export function getRealContext(): ContextBridgePayload {
    const activeContext: any[] = []; 
    let decisionLog: any[] = [];
    let gitAvailable = false;

    // 1. Try Capture Git Status (Modified Files)
    try {
        const statusOutput = execSync("git status --short", { encoding: "utf-8", cwd: WORKSPACE_ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
        gitAvailable = true;
        const modifiedFiles = statusOutput.split("\n")
            .map(line => line.trim().split(" ").pop())
            .filter((f): f is string => !!f && !f.startsWith(".."));

        for (const file of modifiedFiles) {
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
                     note: "Active modified file (Git)"
                 });
             }
        }
    } catch (e) {
        gitAvailable = false;
    }

    // 2. Fallback: File System Scan (If Git failed or returned nothing)
    if (!gitAvailable || activeContext.length === 0) {
        const recentFiles = getRecentFiles(WORKSPACE_ROOT);
        for (const file of recentFiles) {
             if (activeContext.some(c => c.path === file)) continue;

             const fullPath = path.join(WORKSPACE_ROOT, file);
             const content = fs.readFileSync(fullPath, "utf-8");
             activeContext.push({
                 type: "file",
                 path: file,
                 content: summarizeFile(content),
                 compression: "snippet",
                 relevance: 0.8,
                 note: "Recently modified file (FS Scan)"
             });
        }
    }

    // 3. Capture Long-term Memory
    if (fs.existsSync(MEMORY_FILE)) {
        const content = fs.readFileSync(MEMORY_FILE, "utf-8");
        activeContext.push({
            type: "file",
            path: "MEMORY.md",
            content: summarizeFile(content, 100),
            compression: "summary",
            relevance: 0.9,
            note: "Long-term memory"
        });
    }

    // 4. Capture Daily Memory
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

    // 5. Capture Chat History (Hybrid)
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
        try {
            const rawContent = fs.readFileSync(CHAT_HISTORY_FILE, "utf-8");
            const messages = JSON.parse(rawContent);
            if (Array.isArray(messages)) {
                // A. Sliding Window
                const recentMessages = messages.slice(-10); 
                activeContext.push({
                    type: "file",
                    path: "memory/chat_history.json",
                    content: JSON.stringify(recentMessages, null, 2),
                    compression: "snippet",
                    relevance: 0.9,
                    note: "Recent 10 messages"
                });

                // B. Decision Extraction
                if (messages.length > 10) {
                    const olderMessages = messages.slice(0, -10);
                    const extractedDecisions = extractKeyDecisions(olderMessages);
                    if (extractedDecisions.length > 0) {
                         decisionLog = extractedDecisions.map(d => ({
                             id: d.id,
                             question: "Historical Decision",
                             options: [{
                                 id: "opt-1",
                                 description: d.decision,
                                 status: "chosen",
                                 reasoning: "Extracted from history"
                             }],
                             selectedOptionId: "opt-1"
                         }));
                    }
                }
            }
        } catch (e) { }
    }

    return {
        schemaVersion: "1.0.0",
        sessionId: process.env.SESSION_ID || "current-session",
        timestamp: new Date().toISOString(),
        agent: { name: "OpenClaw-Local" },
        activeContext,
        decisionLog,
        constraints: ["Context Bridge Active"]
    };
}
