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

export const MID_CASES: HassTestCase[] = [
  {
    id: "mid-bedroom-ac-conditional-noop",
    description: "温度条件不满足时不打开空调",
    query: "如果卧室的温度超过25度，帮我打开空调。",
    prepare: async ({ benchmark }) => {
      await benchmark.switch.bedroomMockAcPower.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertEntityState("switch.bedroom_mock_ac_power", "off"),
    ],
  },
  {
    id: "mid-bedroom-lights-and-ac",
    description: "打开卧室灯并打开空调",
    query: "打开卧室的灯，然后打开空调，调到制冷。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomLamp.turnOff();
      await benchmark.light.bedroomMainLight.turnOff();
      await benchmark.switch.bedroomMockAcPower.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      async ({ benchmark }) => {
        const pass =
          benchmark.light.bedroomLamp.isOn &&
          benchmark.light.bedroomMainLight.isOn &&
          benchmark.switch.bedroomMockAcPower.isOn;
        return {
          pass,
          reason: pass
            ? undefined
            : "卧室灯光或模拟空调电源没有被全部打开。",
          details: {
            bedroomLamp: benchmark.light.bedroomLamp.state,
            bedroomMainLight: benchmark.light.bedroomMainLight.state,
            bedroomMockAcPower: benchmark.switch.bedroomMockAcPower.state,
          },
        };
      },
    ],
  },
  {
    id: "mid-living-room-lights-conditional-noop",
    description: "客厅亮度条件不满足时不应开灯",
    query: "如果客厅亮度低于100lx，就把客厅的灯都打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightFront.turnOff();
      await benchmark.light.livingRoomCeilingLightBack.turnOn();
      await benchmark.light.livingRoomFloorLamp.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      async ({ benchmark }) => {
        const pass =
          !benchmark.light.livingRoomCeilingLightFront.isOn &&
          benchmark.light.livingRoomCeilingLightBack.isOn &&
          !benchmark.light.livingRoomFloorLamp.isOn;
        return {
          pass,
          reason: pass
            ? undefined
            : "亮度条件不满足时，客厅灯状态被错误改动了。",
          details: {
            front: benchmark.light.livingRoomCeilingLightFront.state,
            back: benchmark.light.livingRoomCeilingLightBack.state,
            floor: benchmark.light.livingRoomFloorLamp.state,
          },
        };
      },
    ],
  },
  {
    id: "mid-living-room-lights-off-when-no-motion",
    description: "客厅没人时关闭客厅灯",
    query: "如果客厅没人，就把客厅的灯关掉。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightFront.turnOn();
      await benchmark.light.livingRoomCeilingLightBack.turnOn();
      await benchmark.light.livingRoomFloorLamp.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertEntityState(HASS_ENTITY_IDS.livingRoomMotion, "off"),
      async ({ benchmark }) => {
        const pass =
          !benchmark.light.livingRoomCeilingLightFront.isOn &&
          !benchmark.light.livingRoomCeilingLightBack.isOn &&
          !benchmark.light.livingRoomFloorLamp.isOn;
        return {
          pass,
          reason: pass
            ? undefined
            : "客厅无人时没有把灯全部关闭。",
          details: {
            front: benchmark.light.livingRoomCeilingLightFront.state,
            back: benchmark.light.livingRoomCeilingLightBack.state,
            floor: benchmark.light.livingRoomFloorLamp.state,
          },
        };
      },
    ],
  },
  {
    id: "mid-kitchen-lights-adjust",
    description: "打开厨房顶灯和台面灯",
    query: "帮我把厨房的灯打开一点，台面灯亮一点就行，顶灯也打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.kitchenCeilingLight.turnOn();
      await benchmark.light.kitchenCounterLight.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      async ({ benchmark }) => {
        const pass =
          benchmark.light.kitchenCeilingLight.isOn &&
          benchmark.light.kitchenCounterLight.isOn;
        return {
          pass,
          reason: pass
            ? undefined
            : "厨房顶灯或台面灯没有按预期打开。",
          details: {
            ceiling: benchmark.light.kitchenCeilingLight.state,
            counter: benchmark.light.kitchenCounterLight.state,
            counterBrightness: benchmark.light.kitchenCounterLight.brightness,
          },
        };
      },
    ],
  },
  {
    id: "mid-bedroom-curtain-then-lamp",
    description: "窗帘拉上时打开卧室台灯",
    query: "看看卧室窗帘是不是拉上了；如果已经拉上了，就把卧室台灯打开。",
    prepare: async ({ benchmark }) => {
      await closeBedroomCurtain(benchmark);
      await benchmark.light.bedroomLamp.turnOff();
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertEntityState(HASS_ENTITY_IDS.bedroomCurtain, "closed"),
      async ({ benchmark }) => ({
        pass: benchmark.light.bedroomLamp.isOn,
        reason: benchmark.light.bedroomLamp.isOn
          ? undefined
          : "卧室窗帘已拉上，但台灯没有打开。",
        details: {
          bedroomLamp: benchmark.light.bedroomLamp.state,
        },
      }),
    ],
  },
  {
    id: "mid-front-door-lock-if-needed",
    description: "大门未锁则锁上；当前已锁则保持",
    query: "大门锁了没。没有就锁上。",
    prepare: async ({ benchmark }) => {
      await lockFrontDoor(benchmark);
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertEntityState(HASS_ENTITY_IDS.frontDoorLock, "locked"),
    ],
  },
  {
    id: "mid-bedroom-sleep-summary",
    description: "睡前查看卧室情况",
    query: "我要睡觉了，帮我看看卧室什么情况。",
    prepare: async ({ benchmark }) => {
      await closeBedroomCurtain(benchmark);
    },
    check: [
      assertNonEmptyFinalResponse(),
      assertIncludesAll([
        ["卧室", "房间"],
        ["窗", "窗户"],
        ["窗帘", "帘子"],
      ]),
      assertEntityState(HASS_ENTITY_IDS.bedroomCurtain, "closed"),
      assertEntityState(HASS_ENTITY_IDS.bedroomWindow, "off"),
    ],
  },
];
