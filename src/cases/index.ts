import type { HassTestCase } from "./schema.js";
import {
  assertIncludesAll,
  assertNonEmptyFinalResponse,
} from "../checks/common.js";

export const TEST_CASES: HassTestCase[] = [
  {
    id: "easy-bedroom-temperature-humidity",
    description: "查询卧室温湿度",
    query: "现在卧室的温湿度怎么样? 用数字告诉我。",
    prepare: async () => {},
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["20", "40"]),
    ],
  },
  {
    id: "easy-bedroom-lights-control",
    description: "打开卧室的灯",
    query: "帮我开卧室的所有灯。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomLamp.turnOff();
      await benchmark.light.bedroomMainLight.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      async ({ benchmark }) => {
        const pass =
          benchmark.light.bedroomLamp.isOn &&
          benchmark.light.bedroomMainLight.isOn;
        return {
          pass,
          reason: pass
            ? undefined
            : "卧室的灯没有被正确打开，请检查卧室台灯和主灯的状态。",
          details: {
            bedroomLamp: benchmark.light.bedroomLamp.state,
            bedroomMainLight:
              benchmark.light.bedroomMainLight.state,
          },
        };
      },
    ],
  },
];
