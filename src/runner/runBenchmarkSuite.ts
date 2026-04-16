import type { Client } from "@a2a-js/sdk/client";

import { connectBenchmarkKit } from "../benchmark-runtime.js";
import type {
  BenchmarkSuiteResult,
  CaseRunResult,
  CheckResult,
  HassTestCase,
  NormalizedCheckResult,
  NormalizedHassTestCase,
} from "../cases/schema.js";
import { normalizeTestCase } from "../utils/normalizeTestCase.js";
import {
  createA2AClient,
  runA2AConversation,
} from "../a2a/client.js";

export type RunBenchmarkSuiteOptions = {
  suiteId: string;
  a2aServiceUrl: string;
  hassUrl: string;
  accessToken: string;
  cases: HassTestCase[];
};

function normalizeCheckResult(result: CheckResult): NormalizedCheckResult {
  if (typeof result === "boolean") {
    return { pass: result };
  }

  return result;
}

function aggregateCheckResults(results: NormalizedCheckResult[]): {
  pass: boolean;
  reasons: string[];
  details: Record<string, unknown>[];
} {
  const failedResults = results.filter((result) => !result.pass);

  return {
    pass: failedResults.length === 0,
    reasons: failedResults
      .map((result) => result.reason)
      .filter((reason): reason is string => Boolean(reason)),
    details: failedResults
      .map((result) => result.details)
      .filter((details): details is Record<string, unknown> => Boolean(details)),
  };
}

async function runCase(args: {
  testCase: NormalizedHassTestCase;
  caseIndex: number;
  suiteId: string;
  benchmark: Awaited<ReturnType<typeof connectBenchmarkKit>>;
  a2aClient: Client;
  a2aServiceUrl: string;
}): Promise<CaseRunResult> {
  const {
    testCase,
    caseIndex,
    suiteId,
    benchmark,
    a2aClient,
    a2aServiceUrl,
  } = args;
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  const baseContext = {
    suiteId,
    benchmark,
    a2aClient,
    a2aServiceUrl,
    testCase,
    caseIndex,
  };

  await testCase.prepare?.(baseContext);

  const transcript = await runA2AConversation(a2aServiceUrl, testCase.query);
  const finalTurn = transcript.at(-1);

  if (!finalTurn) {
    throw new Error(`Case ${testCase.id} produced no transcript.`);
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAtMs;
  const checkContext = {
    ...baseContext,
    transcript,
    startedAt,
    finishedAt,
    durationMs,
    finalResponse: finalTurn.response,
    finalResponseText: finalTurn.responseText,
  };
  const checkResults = await Promise.all(
    testCase.check.map(async (check) => normalizeCheckResult(await check(checkContext))),
  );
  const aggregated = aggregateCheckResults(checkResults);

  return {
    id: testCase.id,
    description: testCase.description,
    pass: aggregated.pass,
    reasons: aggregated.reasons,
    details: aggregated.details,
    startedAt,
    finishedAt,
    durationMs,
    transcript,
  };
}

export async function runBenchmarkSuite(
  options: RunBenchmarkSuiteOptions,
): Promise<BenchmarkSuiteResult> {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  const benchmark = await connectBenchmarkKit({
    hassUrl: options.hassUrl,
    accessToken: options.accessToken,
  });
  const a2aClient = await createA2AClient(options.a2aServiceUrl);

  try {
    const normalizedCases = options.cases.map(normalizeTestCase);
    const results: CaseRunResult[] = [];

    for (const [caseIndex, testCase] of normalizedCases.entries()) {
      results.push(
        await runCase({
          testCase,
          caseIndex,
          suiteId: options.suiteId,
          benchmark,
          a2aClient,
          a2aServiceUrl: options.a2aServiceUrl,
        }),
      );
    }

    const passed = results.filter((result) => result.pass).length;
    const finishedAt = new Date().toISOString();

    return {
      suiteId: options.suiteId,
      a2aServiceUrl: options.a2aServiceUrl,
      total: results.length,
      passed,
      failed: results.length - passed,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedAtMs,
      cases: results,
    };
  } finally {
    benchmark.client.close();
  }
}
