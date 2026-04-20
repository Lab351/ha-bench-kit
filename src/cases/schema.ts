import type { Client } from "@a2a-js/sdk/client";
import type { Message, Task } from "@a2a-js/sdk";

import type { BenchmarkKit } from "../benchmark-runtime.js";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CheckResult =
  | boolean
  | {
      pass: boolean;
      reason?: string;
      details?: Record<string, unknown>;
    };

export type NormalizedCheckResult = {
  pass: boolean;
  reason?: string;
  details?: Record<string, unknown>;
};

export type A2ATranscriptTurn = {
  request: ConversationTurn;
  response: Message | Task;
  responseText: string;
};

export type BenchmarkRunContext = {
  readonly benchmark: BenchmarkKit;
  readonly a2aClient: Client;
  readonly a2aServiceUrl: string;
};

export type PreparedCaseContext = BenchmarkRunContext & {
  readonly testCase: NormalizedHassTestCase;
  readonly caseIndex: number;
};

export type CheckContext = PreparedCaseContext & {
  readonly transcript: A2ATranscriptTurn[];
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly finalResponse: Message | Task;
  readonly finalResponseText: string;
};

export type HassTestCase = {
  id: string;
  description: string;
  query: ConversationTurn[] | string;
  prepare?: (context: PreparedCaseContext) => Promise<void>;
  check: Array<(context: CheckContext) => Promise<CheckResult>>;
};

export type NormalizedHassTestCase = Omit<HassTestCase, "query"> & {
  query: ConversationTurn[];
};

export type CaseRunResult = {
  id: string;
  description: string;
  pass: boolean;
  reasons: string[];
  details: Record<string, unknown>[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  transcript: A2ATranscriptTurn[];
};

export type BenchmarkSuiteResult = {
  a2aServiceUrl: string;
  total: number;
  passed: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cases: CaseRunResult[];
};
