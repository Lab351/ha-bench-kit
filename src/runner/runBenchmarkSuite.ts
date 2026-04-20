import type { Client } from "@a2a-js/sdk/client";

import { connectBenchmarkKit } from "../benchmark-runtime.js";
import type {
  BenchmarkSuiteResult,
  BenchmarkStatus,
  CaseRunResult,
  CheckDefinition,
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

const CASE_SETTLE_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type RunBenchmarkSuiteOptions = {
  a2aServiceUrl: string;
  hassUrl: string;
  accessToken: string;
  cases: HassTestCase[];
  onStatus?: (status: BenchmarkStatus) => void;
};

function normalizeCheckResult(result: CheckResult): NormalizedCheckResult {
  if (typeof result === "boolean") {
    return {
      pass: result,
      pointsAwarded: 0,
      pointsPossible: 0,
    };
  }

  return {
    ...result,
    pointsAwarded: 0,
    pointsPossible: 0,
  };
}

function aggregateCheckResults(results: NormalizedCheckResult[]): {
  pass: boolean;
  score: number;
  maxScore: number;
  reasons: string[];
  details: Record<string, unknown>[];
} {
  const failedResults = results.filter((result) => !result.pass);
  const score = results.reduce((sum, result) => sum + result.pointsAwarded, 0);
  const maxScore = results.reduce(
    (sum, result) => sum + result.pointsPossible,
    0,
  );

  return {
    pass: failedResults.length === 0,
    score,
    maxScore,
    reasons: failedResults
      .map((result) => result.reason)
      .filter((reason): reason is string => Boolean(reason)),
    details: failedResults
      .map((result) => result.details)
      .filter((details): details is Record<string, unknown> => Boolean(details)),
  };
}

async function runCheck(
  check: CheckDefinition,
  context: Parameters<CheckDefinition["run"]>[0],
): Promise<NormalizedCheckResult> {
  const rawResult = normalizeCheckResult(await check.run(context));
  const pointsPossible = check.points ?? 0;

  return {
    ...rawResult,
    label: check.label,
    pointsPossible,
    pointsAwarded: rawResult.pass ? pointsPossible : 0,
  };
}

async function runCase(args: {
  testCase: NormalizedHassTestCase;
  caseIndex: number;
  totalCases: number;
  benchmark: Awaited<ReturnType<typeof connectBenchmarkKit>>;
  a2aClient: Client;
  a2aServiceUrl: string;
  onStatus?: (status: BenchmarkStatus) => void;
}): Promise<CaseRunResult> {
  const {
    testCase,
    caseIndex,
    totalCases,
    benchmark,
    a2aClient,
    a2aServiceUrl,
    onStatus,
  } = args;
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  const baseContext = {
    benchmark,
    a2aClient,
    a2aServiceUrl,
    testCase,
    caseIndex,
  };

  onStatus?.({
    message: `Preparing case ${caseIndex + 1}/${totalCases}: ${testCase.id} (${testCase.description})`,
    caseId: testCase.id,
    caseIndex,
    totalCases,
  });

  try {
    await testCase.prepare?.(baseContext);
    onStatus?.({
      message: `Running case ${caseIndex + 1}/${totalCases}: ${testCase.id} (${testCase.description})`,
      caseId: testCase.id,
      caseIndex,
      totalCases,
    });

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
      testCase.check.map(async (check) => runCheck(check, checkContext)),
    );
    const aggregated = aggregateCheckResults(checkResults);
    onStatus?.({
      message: `${aggregated.pass ? "Passed" : "Failed"} case ${caseIndex + 1}/${totalCases}: ${testCase.id} (${durationMs}ms)`,
      caseId: testCase.id,
      caseIndex,
      totalCases,
    });

    return {
      id: testCase.id,
      description: testCase.description,
      pass: aggregated.pass,
      score: aggregated.score,
      maxScore: aggregated.maxScore,
      reasons: aggregated.reasons,
      details: aggregated.details,
      checkResults,
      startedAt,
      finishedAt,
      durationMs,
      transcript,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    onStatus?.({
      message: `Errored case ${caseIndex + 1}/${totalCases}: ${testCase.id} (${reason})`,
      caseId: testCase.id,
      caseIndex,
      totalCases,
    });
    throw error;
  }
}

export async function runBenchmarkSuite(
  options: RunBenchmarkSuiteOptions,
): Promise<BenchmarkSuiteResult> {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const totalCases = options.cases.length;
  let benchmark: Awaited<ReturnType<typeof connectBenchmarkKit>> | undefined;

  options.onStatus?.({
    message: `Starting benchmark suite with ${totalCases} case${totalCases === 1 ? "" : "s"}.`,
    totalCases,
  });

  try {
    benchmark = await connectBenchmarkKit({
      hassUrl: options.hassUrl,
      accessToken: options.accessToken,
    });
    const a2aClient = await createA2AClient(options.a2aServiceUrl);
    const normalizedCases = options.cases.map(normalizeTestCase);
    const results: CaseRunResult[] = [];

    for (const [caseIndex, testCase] of normalizedCases.entries()) {
      results.push(
        await runCase({
          testCase,
          caseIndex,
          totalCases,
          benchmark,
          a2aClient,
          a2aServiceUrl: options.a2aServiceUrl,
          onStatus: options.onStatus,
        }),
      );

      options.onStatus?.({
        message: `Completed ${caseIndex + 1}/${totalCases} cases.`,
        caseId: testCase.id,
        caseIndex,
        totalCases,
      });

      if (caseIndex < normalizedCases.length - 1) {
        await sleep(CASE_SETTLE_DELAY_MS);
      }
    }

    const passed = results.filter((result) => result.pass).length;
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
    const finishedAt = new Date().toISOString();

    return {
      a2aServiceUrl: options.a2aServiceUrl,
      total: results.length,
      passed,
      failed: results.length - passed,
      totalScore,
      maxScore,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedAtMs,
      cases: results,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    options.onStatus?.({
      message: `Benchmark suite failed: ${reason}`,
      totalCases,
    });
    throw error;
  } finally {
    options.onStatus?.({
      message: "Shutting down benchmark clients.",
      totalCases,
    });
    benchmark?.client.close();
  }
}
