import { z } from "zod";

// --- Enums & Primitives ---

export const CompressionLevel = z.enum(["full", "snippet", "summary", "reference"]);
export type CompressionLevel = z.infer<typeof CompressionLevel>;

export const RelevanceScore = z.number().min(0).max(1);
export type RelevanceScore = z.infer<typeof RelevanceScore>;

// --- Core Structures ---

/**
 * Represents a file in the workspace.
 * Can be a full file, a specific snippet (e.g. a function), or just a reference.
 */
export const FileContext = z.object({
  type: z.literal("file"),
  path: z.string().describe("Workspace-relative path"),
  content: z.string().optional(),
  checksum: z.string().optional().describe("SHA-256 of content for consistency checks"),
  
  // For partial views
  startLine: z.number().int().min(1).optional(),
  endLine: z.number().int().min(1).optional(),
  
  compression: CompressionLevel,
  relevance: RelevanceScore,
  note: z.string().optional().describe("Why is this file relevant?"),
});
export type FileContext = z.infer<typeof FileContext>;

/**
 * A "Tombstone" represents a failed attempt or a dead end.
 * Crucial for preventing Agent B from repeating Agent A's mistakes.
 */
export const Tombstone = z.object({
  type: z.literal("tombstone"),
  action: z.string().describe("What was attempted? e.g. 'Used regex to parse HTML'"),
  outcome: z.string().describe("What went wrong? e.g. 'Failed on nested tags'"),
  artifacts: z.array(z.string()).optional().describe("Links to logs or error dumps"),
  relevance: RelevanceScore,
});
export type Tombstone = z.infer<typeof Tombstone>;

/**
 * Structured Decision Log.
 * Replaces free-text history with a DAG (Directed Acyclic Graph) of choices.
 */
export const DecisionNode = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(["chosen", "rejected", "explored_and_failed"]),
    reasoning: z.string(),
  })),
  selectedOptionId: z.string().optional(),
});
export type DecisionNode = z.infer<typeof DecisionNode>;

// --- The Bridge Payload ---

export const ContextBridgePayload = z.object({
  schemaVersion: z.literal("1.0.0"),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  
  agent: z.object({
    name: z.string(),
    model: z.string().optional(),
  }),

  // The "Meat" of the context
  activeContext: z.array(z.union([FileContext, Tombstone])),
  decisionLog: z.array(DecisionNode),
  
  // Hard/Soft constraints for the next agent
  constraints: z.array(z.string()),
});
export type ContextBridgePayload = z.infer<typeof ContextBridgePayload>;
