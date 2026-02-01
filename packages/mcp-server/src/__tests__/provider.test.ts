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
    // Mock readdir/stat for fallback
    vi.mocked(fs.readdirSync).mockReturnValue([]); 
    vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: Date.now() } as any);

    const context = getRealContext();

    expect(context.activeContext.length).toBeGreaterThan(0);
    expect(context.activeContext[0].path).toBe("src/index.ts");
  });

  it("should fallback to FS scan when git fails", () => {
    // 1. Fail Git
    vi.mocked(child_process.execSync).mockImplementation(() => {
      throw new Error("Not a git repo");
    });

    // 2. Mock FS Scan
    // Mock directory structure: root -> [file1.ts, file2.ts]
    const mockFiles = [
        { name: "recent.ts", isDirectory: () => false, isFile: () => true },
        { name: "old.ts", isDirectory: () => false, isFile: () => true },
    ];
    vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any);
    
    // Mock stats: recent.ts is new, old.ts is old
    vi.mocked(fs.statSync).mockImplementation((p: any) => {
        if (p.includes("recent.ts")) return { mtimeMs: Date.now() } as any;
        return { mtimeMs: Date.now() - 1000000000 } as any; // Very old
    });
    
    vi.mocked(fs.readFileSync).mockReturnValue("content");

    const context = getRealContext();
    
    // Should capture 'recent.ts' but not 'old.ts'
    const captured = context.activeContext.find(c => c.path === "recent.ts");
    expect(captured).toBeDefined();
    expect(captured?.note).toContain("FS Scan");
  });
});
