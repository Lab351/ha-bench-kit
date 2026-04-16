import "dotenv/config";

export {
  BENCHMARK_LIGHTS,
  BENCHMARK_SWITCHES,
} from "./benchmark-config.js";
export {
  EntityHandle,
  LightHandle,
  SwitchHandle,
  connectBenchmarkKit,
  createBenchmarkKit,
  type BenchmarkKit,
} from "./benchmark-runtime.js";
export {
  HaWsClient,
  type HaClientOptions,
} from "./ha-client.js";
import { connectBenchmarkKit } from "./benchmark-runtime.js";

if (!process.env.HA_URL || !process.env.HA_TOKEN) {
  console.error(
    "Please set the HA_URL and HA_TOKEN environment variables.",
  );
  process.exit(1);
}

const kit = await connectBenchmarkKit({
  hassUrl: process.env.HA_URL,
  accessToken: process.env.HA_TOKEN,
});

console.log(
  "Bedroom lamp is on:",
  kit.light.bedroomLamp.isOn,
);
console.log(
  "Mock AC power is on:",
  kit.switch.bedroomMockAcPower.isOn,
);

kit.client.close();
