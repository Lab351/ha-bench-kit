import type { HassTestCase } from "./schema.js";
import {
  assertIncludesAll,
  assertNonEmptyFinalResponse,
} from "../checks/common.js";
import {
  HASS_ENTITY_IDS,
  assertEntityState,
  lockFrontDoor,
} from "./hassHelpers.js";

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
  {
    id: "easy-bedroom-lights-control",
    description: "打开卧室的灯",
    query: "帮我开卧室的灯。",
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
            bedroomMainLight: benchmark.light.bedroomMainLight.state,
          },
        };
      },
    ],
  },
  {
    id: "easy-living-room-humidity",
    description: "查询客厅湿度",
    query: "现在客厅湿度是多少?",
    prepare: async () => {},
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["湿度", "48"]),
    ],
  },
  {
    id: "easy-front-door-lock-status",
    description: "查询前门锁状态",
    query: "看一下前门锁上了没有。",
    prepare: async ({ benchmark }) => {
      await lockFrontDoor(benchmark);
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["锁"]),
      assertEntityState(HASS_ENTITY_IDS.frontDoorLock, "locked"),
    ],
  },
  {
    id: "easy-kitchen-motion",
    description: "查询厨房是否有人经过",
    query: "厨房现在有人经过吗?",
    prepare: async () => {},
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["没有", "运动"]),
      assertEntityState(HASS_ENTITY_IDS.kitchenMotion, "off"),
    ],
  },
  {
    id: "easy-bedroom-window-status",
    description: "查询卧室窗户是否打开",
    query: "卧室窗现在是开着吗?",
    prepare: async () => {},
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["窗", "关"]),
      assertEntityState(HASS_ENTITY_IDS.bedroomWindow, "off"),
    ],
  },
];
