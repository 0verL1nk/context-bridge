// vitest globals enabled via vitest.config.ts
import { ContextBridgePayload, FileContext } from "../index";

describe("ContextBridge Protocol Schema", () => {
  it("should validate a correct payload", () => {
    const validPayload = {
      schemaVersion: "1.0.0",
      sessionId: "test-session",
      timestamp: "2023-10-27T10:00:00.000Z",
      agent: {
        name: "TestAgent",
        model: "gpt-4"
      },
      activeContext: [
        {
          type: "file",
          path: "src/main.ts",
          compression: "full",
          relevance: 1.0,
          note: "Main entry"
        }
      ],
      decisionLog: [],
      constraints: ["No bugs"]
    };

    const result = ContextBridgePayload.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should reject invalid schema version", () => {
    const invalidPayload = {
      schemaVersion: "0.9.0", // Invalid
      sessionId: "test-session",
      timestamp: new Date().toISOString(),
      agent: { name: "TestAgent" },
      activeContext: [],
      decisionLog: [],
      constraints: []
    };

    const result = ContextBridgePayload.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("schemaVersion");
    }
  });

  it("should require mandatory fields in FileContext", () => {
    const invalidFile = {
      type: "file",
      // path is missing
      compression: "full",
      relevance: 1.0
    };

    const result = FileContext.safeParse(invalidFile);
    expect(result.success).toBe(false);
  });
});
