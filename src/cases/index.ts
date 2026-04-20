import type { HassTestCase } from "./schema.js";
import type { CheckContext, CheckDefinition, CheckResult } from "./schema.js";
import {
  assertFinalResponseMatches,
  assertIncludesAll,
  assertNonEmptyFinalResponse,
} from "../checks/common.js";
import {
  assertEntityState,
  assertEntityStateOneOf,
  closeBedroomCurtain,
  getEntityAttributes,
  getEntityState,
  HASS_ENTITY_IDS,
  openBedroomCurtain,
} from "./hassHelpers.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitBeforeChecks(ms: number) {
  return async () => {
    await sleep(ms);
    return true;
  };
}

function scored(points: number, run: CheckDefinition["run"], label?: string): CheckDefinition {
  return {
    run,
    points,
    label,
  };
}

function unscored(run: CheckDefinition["run"], label?: string): CheckDefinition {
  return {
    run,
    points: 0,
    label,
  };
}

function assertEntitiesState(
  expected: Array<{ entityId: string; expectedStates: string[] }>,
  reason: string,
) {
  return async ({ benchmark }: CheckContext): Promise<CheckResult> => {
    const details = expected.map(({ entityId, expectedStates }) => {
      const actualState = getEntityState(benchmark, entityId);
      return {
        entityId,
        expectedStates,
        actualState,
      };
    });

    return {
      pass: details.every(({ actualState, expectedStates }) =>
        expectedStates.includes(actualState),
      ),
      reason,
      details: {
        entities: details,
      },
    };
  };
}

function assertAnyEntityState(
  expected: Array<{ entityId: string; expectedStates: string[] }>,
  reason: string,
) {
  return async ({ benchmark }: CheckContext): Promise<CheckResult> => {
    const details = expected.map(({ entityId, expectedStates }) => {
      const actualState = getEntityState(benchmark, entityId);
      return {
        entityId,
        expectedStates,
        actualState,
      };
    });

    return {
      pass: details.some(({ actualState, expectedStates }) =>
        expectedStates.includes(actualState),
      ),
      reason,
      details: {
        entities: details,
      },
    };
  };
}

function assertLivingRoomDimmedButNotDark(reason: string) {
  return async ({ benchmark }: CheckContext): Promise<CheckResult> => {
    const frontState = getEntityState(
      benchmark,
      HASS_ENTITY_IDS.livingRoomCeilingLightFront,
    );
    const backState = getEntityState(
      benchmark,
      HASS_ENTITY_IDS.livingRoomCeilingLightBack,
    );
    const floorState = getEntityState(
      benchmark,
      HASS_ENTITY_IDS.livingRoomFloorLamp,
    );
    const floorBrightness = getEntityAttributes(
      benchmark,
      HASS_ENTITY_IDS.livingRoomFloorLamp,
    ).brightness;
    const floorBrightnessValue =
      typeof floorBrightness === "number" ? floorBrightness : null;

    const stillLit = [frontState, backState, floorState].includes("on");
    const anyLightTurnedOff = [frontState, floorState].includes("off");
    const floorLampDimmed =
      floorState === "on" &&
      typeof floorBrightnessValue === "number" &&
      floorBrightnessValue < 255;
    const pass = stillLit && (anyLightTurnedOff || floorLampDimmed);

    return {
      pass,
      reason: pass ? undefined : reason,
      details: pass
        ? undefined
        : {
            frontState,
            backState,
            floorState,
            floorBrightness: floorBrightnessValue,
            stillLit,
            anyLightTurnedOff,
            floorLampDimmed,
          },
    };
  };
}

function makeDeviceStateCase(options: {
  id: string;
  description: string;
  query: string;
  prepare: HassTestCase["prepare"];
  entityId: string;
  expectedState: string;
  expectedStates?: string[];
  reason: string;
  points?: number;
}): HassTestCase {
  return {
    id: options.id,
    description: options.description,
    query: options.query,
    prepare: options.prepare,
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      options.expectedStates?.length
        ? scored(
            options.points ?? 2,
            assertEntityStateOneOf(
              options.entityId,
              options.expectedStates,
              options.reason,
            ),
            "device-state",
          )
        : scored(
            options.points ?? 2,
            assertEntityState(
              options.entityId,
              options.expectedState,
              options.reason,
            ),
            "device-state",
          ),
    ],
  };
}

function makeResponseCase(options: {
  id: string;
  description: string;
  query: string;
  expectedKeywords?: string[][];
  expectedPattern?: RegExp;
  prepare?: HassTestCase["prepare"];
  points?: number;
}): HassTestCase {
  return {
    id: options.id,
    description: options.description,
    query: options.query,
    prepare: options.prepare ?? (async () => {}),
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      ...(options.expectedKeywords
        ? [
            scored(
              options.points ?? 2,
              assertIncludesAll(options.expectedKeywords),
              "response-keywords",
            ),
          ]
        : []),
      ...(options.expectedPattern
        ? [
            scored(
              options.points ?? 2,
              assertFinalResponseMatches(options.expectedPattern),
              "response-pattern",
            ),
          ]
        : []),
    ],
  };
}

export const TEST_CASES: HassTestCase[] = [
  makeResponseCase({
    id: "easy-bedroom-temperature-query",
    description: "直接查询: 卧室温度",
    query: "现在卧室温度是多少？",
    expectedKeywords: [["20"]],
    points: 2,
  }),
  makeResponseCase({
    id: "easy-bedroom-humidity-query",
    description: "直接查询: 卧室湿度",
    query: "现在卧室湿度是多少？",
    expectedKeywords: [["40"]],
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-bedroom-main-light-on",
    description: "直接控制: 打开卧室主灯",
    query: "把卧室主灯打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomMainLight.turnOff();
    },
    entityId: HASS_ENTITY_IDS.bedroomMainLight,
    expectedState: "on",
    reason: "卧室主灯没有被正确打开。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-bedroom-lamp-off",
    description: "直接控制: 关闭卧室台灯",
    query: "把卧室台灯关掉。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomLamp.turnOn();
    },
    entityId: HASS_ENTITY_IDS.bedroomLamp,
    expectedState: "off",
    reason: "卧室台灯没有被正确关闭。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-living-room-ceiling-front-light-on",
    description: "直接控制: 打开客厅吊顶前灯",
    query: "把客厅吊顶前灯打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightFront.turnOff();
    },
    entityId: HASS_ENTITY_IDS.livingRoomCeilingLightFront,
    expectedState: "on",
    reason: "客厅吊顶前灯没有被正确打开。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-living-room-ceiling-back-light-off",
    description: "直接控制: 关闭客厅吊顶后灯",
    query: "把客厅吊顶后灯关掉。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightBack.turnOn();
    },
    entityId: HASS_ENTITY_IDS.livingRoomCeilingLightBack,
    expectedState: "off",
    reason: "客厅吊顶后灯没有被正确关闭。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-living-room-floor-lamp-on",
    description: "直接控制: 打开客厅落地灯",
    query: "把客厅落地灯打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomFloorLamp.turnOff();
    },
    entityId: HASS_ENTITY_IDS.livingRoomFloorLamp,
    expectedState: "on",
    reason: "客厅落地灯没有被正确打开。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-kitchen-ceiling-light-off",
    description: "直接控制: 关闭厨房顶灯",
    query: "把厨房顶灯关掉。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.kitchenCeilingLight.turnOn();
    },
    entityId: HASS_ENTITY_IDS.kitchenCeilingLight,
    expectedState: "off",
    reason: "厨房顶灯没有被正确关闭。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-bedroom-curtain-open",
    description: "直接控制: 打开卧室窗帘",
    query: "把卧室窗帘打开。",
    prepare: async ({ benchmark }) => {
      await closeBedroomCurtain(benchmark);
    },
    entityId: HASS_ENTITY_IDS.bedroomCurtain,
    expectedState: "open",
    expectedStates: ["opening", "open"],
    reason: "卧室窗帘没有被正确打开。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "easy-bedroom-curtain-close",
    description: "直接控制: 关闭卧室窗帘",
    query: "把卧室窗帘关上。",
    prepare: async ({ benchmark }) => {
      await openBedroomCurtain(benchmark);
    },
    entityId: HASS_ENTITY_IDS.bedroomCurtain,
    expectedState: "closed",
    expectedStates: ["closing", "closed"],
    reason: "卧室窗帘没有被正确关闭。",
    points: 2,
  }),
  makeDeviceStateCase({
    id: "vague-bedroom-dimmable-light-off",
    description: "模糊指代: 关闭卧室可调亮度的灯",
    query: "我要睡了，把卧室里那个能调亮度的灯关掉。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomLamp.turnOn();
      await benchmark.light.bedroomMainLight.turnOff();
    },
    entityId: HASS_ENTITY_IDS.bedroomLamp,
    expectedState: "off",
    reason: "卧室里可调亮度的灯没有被正确关闭。",
    points: 3,
  }),
  makeDeviceStateCase({
    id: "vague-kitchen-counter-light-on",
    description: "模糊指代: 打开厨房台面灯",
    query: "厨房要切点水果，把台面那盏灯打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.kitchenCounterLight.turnOff();
      await benchmark.light.kitchenCeilingLight.turnOff();
    },
    entityId: HASS_ENTITY_IDS.kitchenCounterLight,
    expectedState: "on",
    reason: "厨房台面灯没有被正确打开。",
    points: 3,
  }),
  {
    id: "goal-bedroom-brighter",
    description: "只给目标: 让卧室亮一点",
    query: "卧室有点暗，帮我亮一点。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomMainLight.turnOff();
      await benchmark.light.bedroomLamp.turnOff();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        3,
        assertAnyEntityState(
          [
            { entityId: HASS_ENTITY_IDS.bedroomMainLight, expectedStates: ["on"] },
            { entityId: HASS_ENTITY_IDS.bedroomLamp, expectedStates: ["on"] },
          ],
          "卧室没有任何一盏灯被打开，未达到“亮一点”的目标。",
        ),
        "lighting-goal",
      ),
    ],
  },
  {
    id: "goal-living-room-dimmer-not-dark",
    description: "只给目标: 让客厅暗一点但别全关",
    query: "客厅太亮了，帮我暗一点，但别全关。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightFront.turnOn();
      await benchmark.light.livingRoomFloorLamp.turnOn({ brightness: 255 });
      await benchmark.light.livingRoomCeilingLightBack.turnOff();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        3,
        assertLivingRoomDimmedButNotDark(
          "客厅没有被调整到“暗一点但别全关”的目标状态。",
        ),
        "lighting-goal",
      ),
    ],
  },
  makeDeviceStateCase({
    id: "conditional-bedroom-main-light-on",
    description: "条件执行: 如果卧室主灯关着就打开",
    query: "如果卧室主灯还关着，就把它打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomMainLight.turnOff();
    },
    entityId: HASS_ENTITY_IDS.bedroomMainLight,
    expectedState: "on",
    reason: "卧室主灯没有按条件被打开。",
    points: 3,
  }),
  makeDeviceStateCase({
    id: "conditional-bedroom-curtain-close",
    description: "条件执行: 如果窗帘没关就关上",
    query: "我要午睡，如果卧室窗帘没关就把它关上。",
    prepare: async ({ benchmark }) => {
      await openBedroomCurtain(benchmark);
    },
    entityId: HASS_ENTITY_IDS.bedroomCurtain,
    expectedState: "closed",
    expectedStates: ["closing", "closed"],
    reason: "卧室窗帘没有按条件被关闭。",
    points: 3,
  }),
  makeResponseCase({
    id: "lifestyle-bedroom-temperature-humidity",
    description: "生活化查询: 睡前询问卧室温湿度",
    query: "我准备睡觉了，卧室现在温度和湿度分别是多少？直接告诉我数字。",
    expectedKeywords: [["20"], ["40"]],
    points: 3,
  }),
  makeResponseCase({
    id: "lifestyle-bedroom-window-check",
    description: "生活化查询: 确认卧室窗户是否关好",
    query: "睡前帮我确认一下卧室窗户有没有关好。",
    expectedPattern: /(关好了|已关闭|关着|已经关好)/,
    points: 3,
  }),
  {
    id: "combo-bedroom-sleep-prep",
    description: "组合: 睡前准备卧室",
    query: "我要睡觉了，先把卧室窗帘关上，再把卧室里那个能调亮度的灯关掉。",
    prepare: async ({ benchmark }) => {
      await openBedroomCurtain(benchmark);
      await benchmark.light.bedroomLamp.turnOn();
      await benchmark.light.bedroomMainLight.turnOff();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        3,
        assertEntityStateOneOf(
          HASS_ENTITY_IDS.bedroomCurtain,
          ["closing", "closed"],
          "卧室窗帘没有按要求被关闭。",
        ),
        "close-curtain",
      ),
      scored(
        2,
        assertEntityState(
          HASS_ENTITY_IDS.bedroomLamp,
          "off",
          "卧室里可调亮度的灯没有按要求被关闭。",
        ),
        "turn-off-dimmable-light",
      ),
    ],
  },
  {
    id: "combo-living-room-movie-mode",
    description: "组合: 看电视前调整客厅灯光",
    query: "我要在客厅看电视，把前面的顶灯关掉，但落地灯留着。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.livingRoomCeilingLightFront.turnOn();
      await benchmark.light.livingRoomFloorLamp.turnOn();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        3,
        assertEntityState(
          HASS_ENTITY_IDS.livingRoomCeilingLightFront,
          "off",
          "客厅前面的顶灯没有被关闭。",
        ),
        "turn-off-front-light",
      ),
      scored(
        2,
        assertEntityState(
          HASS_ENTITY_IDS.livingRoomFloorLamp,
          "on",
          "客厅落地灯没有被保留为开启状态。",
        ),
        "keep-floor-lamp-on",
      ),
    ],
  },
  {
    id: "combo-kitchen-motion-and-counter-light",
    description: "组合: 条件判断后打开厨房台面灯",
    query:
      "厨房现在要用一下台面。如果厨房里没人动，就把台面那盏灯打开。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.kitchenCounterLight.turnOff();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        2,
        assertEntityState(
          HASS_ENTITY_IDS.kitchenMotion,
          "off",
          "厨房当前并不是无人状态。",
        ),
        "condition-read",
      ),
      scored(
        3,
        assertEntityState(
          HASS_ENTITY_IDS.kitchenCounterLight,
          "on",
          "厨房无人时应打开台面灯，但结果不符合预期。",
        ),
        "turn-on-counter-light",
      ),
    ],
  },
  {
    id: "combo-bedroom-conditional-and-query",
    description: "组合: 条件控制并确认窗户状态",
    query:
      "如果卧室主灯关着就别动它，把卧室里能调亮度的那盏灯关掉，然后告诉我窗户有没有关好。",
    prepare: async ({ benchmark }) => {
      await benchmark.light.bedroomMainLight.turnOff();
      await benchmark.light.bedroomLamp.turnOn();
    },
    check: [
      unscored(waitBeforeChecks(1500), "settle"),
      unscored(assertNonEmptyFinalResponse(), "non-empty-response"),
      scored(
        1,
        assertEntityState(
          HASS_ENTITY_IDS.bedroomMainLight,
          "off",
          "卧室主灯没有保持不变。",
        ),
        "keep-main-light-off",
      ),
      scored(
        2,
        assertEntityState(
          HASS_ENTITY_IDS.bedroomLamp,
          "off",
          "卧室里能调亮度的那盏灯没有被关闭。",
        ),
        "turn-off-dimmable-light",
      ),
      scored(
        2,
        assertFinalResponseMatches(/(关好了|已关好|已关闭|关着|已经关好)/),
        "report-window-state",
      ),
    ],
  },
];
