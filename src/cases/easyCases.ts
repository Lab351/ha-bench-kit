import type { HassTestCase } from "./schema.js";
import {
  assertIncludesAll,
  assertNonEmptyFinalResponse,
} from "../checks/common.js";

export const EASY_TEST_CASES: HassTestCase[] = [
  {
    id: "easy-bedroom-temperature-humidity",
    description: "查询卧室温湿度",
    query: "现在卧室的温湿度怎么样?",
    prepare: async () => {},
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["温度", "湿度"]),
    ],
  },
];
