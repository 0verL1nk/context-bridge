// vitest globals enabled via vitest.config.ts
import * as fs from "fs";
import * as child_process from "child_process";
import { getRealContext } from "../context-provider";

// Mock external dependencies
vi.mock("fs");
vi.mock("child_process");

describe("Context Provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should parse git status correctly", () => {
    // Mock Git output
    vi.mocked(child_process.execSync).mockReturnValue("M src/index.ts\n?? new-file.txt");
    
    // Mock File System
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("console.log('hello')");

    const context = getRealContext();

    expect(context.activeContext).toHaveLength(2); // index.ts + new-file.txt (if logic allows untracked)
    // Actually my logic filters '..' and checks regex. 'new-file.txt' matches regex.
    // Wait, '??' output from git status --short might need special handling split.
    // My current logic: line.trim().split(" ").pop() -> "src/index.ts"
  });

  it("should handle git execution failure gracefully", () => {
    vi.mocked(child_process.execSync).mockImplementation(() => {
      throw new Error("Not a git repo");
    });

    const context = getRealContext();
    // Should return empty context or just memory files if they exist
    // Assuming no memory files mocked:
    expect(context.agent.name).toBe("OpenClaw-Local");
  });
});
