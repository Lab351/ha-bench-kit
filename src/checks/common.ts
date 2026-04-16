import type {
  CheckContext,
  CheckResult,
} from "../cases/schema.js";

export function assertNonEmptyFinalResponse(
  reason = "A2A service returned an empty final text response.",
) {
  return async ({ finalResponseText }: CheckContext): Promise<CheckResult> => ({
    pass: finalResponseText.trim().length > 0,
    reason,
    details: {
      finalResponseText,
    },
  });
}

export function assertFinalResponseMatches(
  pattern: RegExp,
  reason?: string,
) {
  return async ({ finalResponseText }: CheckContext): Promise<CheckResult> => ({
    pass: pattern.test(finalResponseText),
    reason:
      reason ??
      `Final response did not match pattern ${pattern.toString()}.`,
    details: {
      finalResponseText,
      pattern: pattern.toString(),
    },
  });
}

export function assertIncludesAll(
  keywords: string[],
  reason?: string,
) {
  return async ({ finalResponseText }: CheckContext): Promise<CheckResult> => {
    const missing = keywords.filter((keyword) => !finalResponseText.includes(keyword));

    return {
      pass: missing.length === 0,
      reason:
        reason ??
        `Final response is missing expected keywords: ${missing.join(", ")}.`,
      details: {
        finalResponseText,
        keywords,
        missing,
      },
    };
  };
}
