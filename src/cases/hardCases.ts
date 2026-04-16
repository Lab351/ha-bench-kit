import type { HassTestCase } from "./schema.js";
import {
  assertIncludesAll,
  assertNonEmptyFinalResponse,
} from "../checks/common.js";
import {
  HASS_ENTITY_IDS,
  assertEntityState,
  closeBedroomCurtain,
  lockFrontDoor,
} from "./hassHelpers.js";

export const HARD_CASES: HassTestCase[] = [
  {
    id: "hard-17",
    description: "复合条件查询",
    query:
      "如果卧室的窗帘拉上了就开灯，然后看看窗有没有关上。",
    prepare: async ({ benchmark }) => {
      await closeBedroomCurtain(benchmark);
      await benchmark.light.bedroomMainLight.turnOn();
      await benchmark.light.bedroomLamp.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["窗", "关"]),
      assertEntityState(HASS_ENTITY_IDS.bedroomCurtain, "closed"),
      assertEntityState(HASS_ENTITY_IDS.bedroomWindow, "off"),
      async ({ benchmark }) => ({
        pass:
          benchmark.light.bedroomMainLight.isOn ||
          benchmark.light.bedroomLamp.isOn,
        reason:
          benchmark.light.bedroomMainLight.isOn ||
          benchmark.light.bedroomLamp.isOn
            ? undefined
            : "窗帘拉上后应至少有一盏卧室灯处于开启状态。",
        details: {
          bedroomMainLight: benchmark.light.bedroomMainLight.state,
          bedroomLamp: benchmark.light.bedroomLamp.state,
        },
      }),
    ],
  },
  {
    id: "hard-19",
    description: "不存在区域时回退查门锁",
    query: "如果玄关有人就开玄关灯；如果没有玄关传感器，就看看能不能改查前门锁的状态并告诉我结果。",
    prepare: async ({ benchmark }) => {
      await lockFrontDoor(benchmark);
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll(["前门", "锁"]),
      assertEntityState(HASS_ENTITY_IDS.frontDoorLock, "locked"),
    ],
  },
];
