import {
  BENCHMARK_LIGHTS,
  BENCHMARK_SWITCHES,
  type LightAlias,
  type LightConfig,
  type SwitchAlias,
  type SwitchConfig,
} from "./benchmark-config.js";
import { HaWsClient } from "./ha-client.js";

export class EntityHandle<TConfig extends { entityId: string; deviceName: string }> {
  constructor(
    protected readonly client: HaWsClient,
    readonly config: TConfig,
  ) {}

  get entityId(): TConfig["entityId"] {
    return this.config.entityId;
  }

  get deviceName(): string {
    return this.config.deviceName;
  }

  protected get entity() {
    return this.client.requireEntity(this.entityId);
  }

  get state(): string {
    return this.entity.state;
  }

  get attributes() {
    return this.entity.attributes;
  }
}

export class LightHandle extends EntityHandle<LightConfig> {
  get isOn(): boolean {
    return this.state === "on";
  }

  get brightness(): number | null {
    const rawBrightness = this.attributes.brightness;
    return typeof rawBrightness === "number" ? rawBrightness : null;
  }

  get supportsBrightness(): boolean {
    return this.config.supportsBrightness;
  }

  async turnOn(options?: { brightness?: number }): Promise<void> {
    const serviceData =
      this.supportsBrightness && typeof options?.brightness === "number"
        ? { brightness: options.brightness }
        : undefined;

    await this.client.callDomainService(
      "light",
      "turn_on",
      { entity_id: this.entityId },
      serviceData,
    );
  }

  async turnOff(): Promise<void> {
    await this.client.callDomainService("light", "turn_off", {
      entity_id: this.entityId,
    });
  }
}

export class SwitchHandle extends EntityHandle<SwitchConfig> {
  get isOn(): boolean {
    return this.state === "on";
  }

  async turnOn(): Promise<void> {
    await this.client.callDomainService("switch", "turn_on", {
      entity_id: this.entityId,
    });
  }

  async turnOff(): Promise<void> {
    await this.client.callDomainService("switch", "turn_off", {
      entity_id: this.entityId,
    });
  }
}

type LightHandles = { [K in LightAlias]: LightHandle };
type SwitchHandles = { [K in SwitchAlias]: SwitchHandle };

function createLightProxy(client: HaWsClient): LightHandles {
  return new Proxy({} as LightHandles, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      const config = BENCHMARK_LIGHTS[property as LightAlias];

      if (!config) {
        throw new Error(`Unknown benchmark light alias: ${property}`);
      }

      return new LightHandle(client, config);
    },
  });
}

function createSwitchProxy(client: HaWsClient): SwitchHandles {
  return new Proxy({} as SwitchHandles, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      const config = BENCHMARK_SWITCHES[property as SwitchAlias];

      if (!config) {
        throw new Error(`Unknown benchmark switch alias: ${property}`);
      }

      return new SwitchHandle(client, config);
    },
  });
}

export type BenchmarkKit = {
  readonly client: HaWsClient;
  readonly light: LightHandles;
  readonly switch: SwitchHandles;
};

export function createBenchmarkKit(client: HaWsClient): BenchmarkKit {
  return {
    client,
    light: createLightProxy(client),
    switch: createSwitchProxy(client),
  };
}

export async function connectBenchmarkKit(options: {
  hassUrl: string;
  accessToken: string;
}): Promise<BenchmarkKit> {
  const client = await HaWsClient.connect(options);
  return createBenchmarkKit(client);
}
