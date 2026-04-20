import "dotenv/config";

import { TEST_CASES } from "../cases/index.js";
import { runBenchmarkSuite } from "./runBenchmarkSuite.js";

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

const result = await runBenchmarkSuite({
  a2aServiceUrl: requireArg("--a2a-url"),
  hassUrl: requireEnv("HA_URL"),
  accessToken: requireEnv("HA_TOKEN"),
  cases: TEST_CASES,
});

console.log(JSON.stringify(result, null, 2));
