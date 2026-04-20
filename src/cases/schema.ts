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

export type CheckFn = (context: CheckContext) => Promise<CheckResult>;

export type CheckDefinition = {
  run: CheckFn;
  points?: number;
  label?: string;
};

export type NormalizedCheckResult = {
  pass: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  pointsAwarded: number;
  pointsPossible: number;
  label?: string;
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

export type BenchmarkStatus = {
  message: string;
  caseId?: string;
  caseIndex?: number;
  totalCases?: number;
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
  check: Array<CheckDefinition | CheckFn>;
};

export type NormalizedHassTestCase = Omit<HassTestCase, "query" | "check"> & {
  query: ConversationTurn[];
  check: CheckDefinition[];
};

export type CaseRunResult = {
  id: string;
  description: string;
  pass: boolean;
  score: number;
  maxScore: number;
  reasons: string[];
  details: Record<string, unknown>[];
  checkResults: NormalizedCheckResult[];
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
  totalScore: number;
  maxScore: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cases: CaseRunResult[];
};
