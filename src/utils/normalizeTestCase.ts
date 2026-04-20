import type {
  CheckDefinition,
  CheckFn,
  HassTestCase,
  NormalizedHassTestCase,
} from "../cases/schema.js";

function normalizeCheckDefinition(
  check: CheckDefinition | CheckFn,
): CheckDefinition {
  if (typeof check === "function") {
    return {
      run: check,
    };
  }

  return check;
}

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
    check: testCase.check.map(normalizeCheckDefinition),
  };
}
