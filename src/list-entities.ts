import "dotenv/config";

import { HaWsClient } from "./ha-client.js";

const SNAPSHOT_TIMEOUT_MS = 10_000;

function requireEnv(name: "HA_URL" | "HA_TOKEN"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function waitForEntitySnapshot(client: HaWsClient): Promise<ReadonlyArray<string>> {
  if (Object.keys(client.allEntities).length > 0) {
    return Object.keys(client.allEntities).sort();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out after ${SNAPSHOT_TIMEOUT_MS}ms waiting for entity snapshot.`));
    }, SNAPSHOT_TIMEOUT_MS);

    const unsubscribe = client.onStateChange((entities) => {
      const entityIds = Object.keys(entities);

      if (entityIds.length === 0) {
        return;
      }

      clearTimeout(timer);
      unsubscribe();
      resolve(entityIds.sort());
    });
  });
}

async function main(): Promise<void> {
  const client = await HaWsClient.connect({
    hassUrl: requireEnv("HA_URL"),
    accessToken: requireEnv("HA_TOKEN"),
  });

  try {
    const entityIds = await waitForEntitySnapshot(client);

    console.error(`Loaded ${entityIds.length} entities:`);

    for (const entityId of entityIds) {
      console.log(entityId);
    }
  } finally {
    client.close();
  }
}

await main();
