import { EASY_TEST_CASES } from "./easyCases.js";
import { MID_CASES } from "./midCases.js";
import { HARD_CASES } from "./hardCases.js";
import type { HassTestCase } from "./schema.js";

export const ALL_TEST_CASES = [
  ...EASY_TEST_CASES,
  ...MID_CASES,
  ...HARD_CASES,
];

export const TEST_CASE_SUITES: Record<string, HassTestCase[]> = {
  all: ALL_TEST_CASES,
  easy: EASY_TEST_CASES,
  mid: MID_CASES,
  hard: HARD_CASES,
};
