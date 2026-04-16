import type {
  CheckContext,
  CheckResult,
} from "../cases/schema.js";

export type KeywordExpectation = string | string[];

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
  keywords: KeywordExpectation[],
  reason?: string,
) {
  return async ({ finalResponseText }: CheckContext): Promise<CheckResult> => {
    const missing = keywords.filter((keywordGroup) => {
      const alternatives = Array.isArray(keywordGroup)
        ? keywordGroup
        : [keywordGroup];

      return !alternatives.some((keyword) =>
        finalResponseText.includes(keyword),
      );
    });

    return {
      pass: missing.length === 0,
      reason:
        reason ??
        `Final response is missing expected keywords: ${missing
          .map((keywordGroup) =>
            Array.isArray(keywordGroup)
              ? `[${keywordGroup.join(" | ")}]`
              : keywordGroup,
          )
          .join(", ")}.`,
      details: {
        finalResponseText,
        keywords,
        missing,
      },
    };
  };
}
