import type { BenchmarkKit } from "../benchmark-runtime.js";
import type { CheckContext, CheckResult } from "./schema.js";

export const HASS_ENTITY_IDS = {
  bedroomTemperature: "sensor.bedroom_temperature_sensor_temperature",
  bedroomHumidity: "sensor.bedroom_temperature_sensor_humidity",
  livingRoomHumidity: "sensor.living_room_ambient_sensor_humidity",
  livingRoomIlluminance: "sensor.living_room_ambient_sensor_illuminance",
  kitchenMotion: "binary_sensor.kitchen_motion_sensor_motion",
  livingRoomMotion: "binary_sensor.living_room_motion_sensor_motion",
  bedroomWindow: "binary_sensor.bedroom_window_contact_sensor_opening",
  bedroomCurtain: "cover.bedroom_curtain_cover",
} as const;

export function getEntityState(
  benchmark: BenchmarkKit,
  entityId: string,
): string {
  return benchmark.client.requireEntity(entityId).state;
}

export function assertEntityState(
  entityId: string,
  expectedState: string,
  reason?: string,
) {
  return async ({ benchmark }: CheckContext): Promise<CheckResult> => {
    const actualState = getEntityState(benchmark, entityId);

    return {
      pass: actualState === expectedState,
      reason:
        reason ??
        `Expected ${entityId} to be ${expectedState}, received ${actualState}.`,
      details: {
        entityId,
        expectedState,
        actualState,
      },
    };
  };
}

export function assertEntityStateOneOf(
  entityId: string,
  expectedStates: string[],
  reason?: string,
) {
  return async ({ benchmark }: CheckContext): Promise<CheckResult> => {
    const actualState = getEntityState(benchmark, entityId);
    const pass = expectedStates.includes(actualState);

    return {
      pass,
      reason:
        reason ??
        `Expected ${entityId} to be one of ${expectedStates.join(", ")}, received ${actualState}.`,
      details: {
        entityId,
        expectedStates,
        actualState,
      },
    };
  };
}

export async function closeBedroomCurtain(benchmark: BenchmarkKit): Promise<void> {
  await benchmark.client.callDomainService("cover", "close_cover", {
    entity_id: HASS_ENTITY_IDS.bedroomCurtain,
  });
}
