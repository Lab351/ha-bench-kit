import type {
  HassTestCase,
  NormalizedHassTestCase,
} from "../cases/schema.js";

export function normalizeTestCase(
  testCase: HassTestCase,
): NormalizedHassTestCase {
  const normalizedQuery =
    typeof testCase.query === "string"
      ? [{ role: "user" as const, content: testCase.query }]
      : testCase.query;

  return {
    ...testCase,
    query: normalizedQuery,
  };
}
