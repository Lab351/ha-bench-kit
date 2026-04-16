export type LightAlias =
  | "bedroomMainLight"
  | "bedroomLamp"
  | "livingRoomCeilingLightFront"
  | "livingRoomCeilingLightBack"
  | "livingRoomFloorLamp"
  | "kitchenCeilingLight"
  | "kitchenCounterLight";

export type SwitchAlias = "bedroomMockAcPower";

export type BenchmarkEntityConfig<
  TDomain extends string,
  TEntityId extends `${TDomain}.${string}`,
> = {
  alias: string;
  entityId: TEntityId;
  deviceName: string;
  domain: TDomain;
};

export type LightConfig = BenchmarkEntityConfig<"light", `light.${string}`> & {
  supportsBrightness: boolean;
};

export type SwitchConfig = BenchmarkEntityConfig<"switch", `switch.${string}`>;

export const BENCHMARK_LIGHTS = {
  bedroomMainLight: {
    alias: "bedroomMainLight",
    deviceName: "Bedroom Main Light",
    entityId: "light.bedroom_main_light",
    domain: "light",
    supportsBrightness: false,
  },
  bedroomLamp: {
    alias: "bedroomLamp",
    deviceName: "Bedroom Lamp",
    entityId: "light.bedroom_lamp",
    domain: "light",
    supportsBrightness: true,
  },
  livingRoomCeilingLightFront: {
    alias: "livingRoomCeilingLightFront",
    deviceName: "Living Room Ceiling Light Front",
    entityId: "light.living_room_ceiling_light_front",
    domain: "light",
    supportsBrightness: false,
  },
  livingRoomCeilingLightBack: {
    alias: "livingRoomCeilingLightBack",
    deviceName: "Living Room Ceiling Light Back",
    entityId: "light.living_room_ceiling_light_back",
    domain: "light",
    supportsBrightness: false,
  },
  livingRoomFloorLamp: {
    alias: "livingRoomFloorLamp",
    deviceName: "Living Room Floor Lamp",
    entityId: "light.living_room_floor_lamp",
    domain: "light",
    supportsBrightness: true,
  },
  kitchenCeilingLight: {
    alias: "kitchenCeilingLight",
    deviceName: "Kitchen Ceiling Light",
    entityId: "light.kitchen_ceiling_light",
    domain: "light",
    supportsBrightness: false,
  },
  kitchenCounterLight: {
    alias: "kitchenCounterLight",
    deviceName: "Kitchen Counter Light",
    entityId: "light.kitchen_counter_light",
    domain: "light",
    supportsBrightness: true,
  },
} as const satisfies Record<LightAlias, LightConfig>;

export const BENCHMARK_SWITCHES = {
  bedroomMockAcPower: {
    alias: "bedroomMockAcPower",
    deviceName: "_Bedroom Mock AC Power",
    entityId: "switch.bedroom_mock_ac_power",
    domain: "switch",
  },
} as const satisfies Record<SwitchAlias, SwitchConfig>;
