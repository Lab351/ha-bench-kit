import "dotenv/config";
import { TEST_CASES } from "./cases/index.js";
import type { HassTestCase } from "./cases/schema.js";

export {
  BENCHMARK_LIGHTS,
  BENCHMARK_SWITCHES,
} from "./benchmark-config.js";
export {
  EntityHandle,
  LightHandle,
  SwitchHandle,
  connectBenchmarkKit,
  createBenchmarkKit,
  type BenchmarkKit,
} from "./benchmark-runtime.js";
export {
  HaWsClient,
  type HaClientOptions,
} from "./ha-client.js";
export { runBenchmarkSuite, type RunBenchmarkSuiteOptions } from "./runner/runBenchmarkSuite.js";
import { runBenchmarkSuite } from "./runner/runBenchmarkSuite.js";

function requireEnv(name: "HA_URL" | "HA_TOKEN"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireArg(flag: "--a2a-url"): string {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;

  if (!value) {
    throw new Error(`Missing required CLI argument: ${flag}`);
  }

  return value;
}

function optionalArg(flag: "--case-id"): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveCases(): HassTestCase[] {
  const caseIdArg = optionalArg("--case-id");

  if (!caseIdArg) {
    return TEST_CASES;
  }

  const requestedIds = caseIdArg
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const requestedIdSet = new Set(requestedIds);
  const filteredCases = TEST_CASES.filter((testCase) =>
    requestedIdSet.has(testCase.id),
  );

  if (filteredCases.length === 0) {
    throw new Error(
      `No cases matched --case-id=${caseIdArg}.`,
    );
  }

  const missingIds = requestedIds.filter(
    (id) => !filteredCases.some((testCase) => testCase.id === id),
  );

  if (missingIds.length > 0) {
    throw new Error(
      `Unknown case id(s): ${missingIds.join(", ")}.`,
    );
  }

  return filteredCases;
}

const selectedCases = resolveCases();

const result = await runBenchmarkSuite({
  a2aServiceUrl: requireArg("--a2a-url"),
  hassUrl: requireEnv("HA_URL"),
  accessToken: requireEnv("HA_TOKEN"),
  cases: selectedCases,
});

console.log(JSON.stringify(result, null, 2));
