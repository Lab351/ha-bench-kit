import {
  callService,
  createConnection,
  createLongLivedTokenAuth,
  createSocket as createHaSocket,
  subscribeEntities,
  type Auth,
  type Connection,
  type ConnectionOptions,
  type HassEntities,
  type HassEntity,
  type HassServiceTarget,
} from "home-assistant-js-websocket/dist/index.js";
import ws from "ws";

type GlobalWithWebSocket = typeof globalThis & {
  WebSocket?: typeof WebSocket;
};

export type HaClientOptions = {
  hassUrl: string;
  accessToken: string;
};

export type EntityStateListener = (entities: Readonly<HassEntities>) => void;

const INITIAL_SNAPSHOT_TIMEOUT_MS = 10_000;

export class HaWsClient {
  static async connect(options: HaClientOptions): Promise<HaWsClient> {
    const auth = createLongLivedTokenAuth(options.hassUrl, options.accessToken);
    const connection = await createConnection({
      auth,
      createSocket: async (connectionOptions: ConnectionOptions) => {
        const globalWithWebSocket = globalThis as GlobalWithWebSocket;

        if (!globalWithWebSocket.WebSocket) {
          globalWithWebSocket.WebSocket = ws as unknown as typeof WebSocket;
        }

        return createHaSocket(connectionOptions);
      },
    });

    const client = new HaWsClient(auth, connection);
    await client.startEntitySubscription();
    return client;
  }

  private entities: HassEntities = {};
  private readonly listeners = new Set<EntityStateListener>();
  private unsubscribeEntities?: () => void;

  private constructor(
    readonly auth: Auth,
    readonly connection: Connection,
  ) {}

  close(): void {
    this.unsubscribeEntities?.();
    this.connection.close();
  }

  onStateChange(listener: EntityStateListener): () => void {
    this.listeners.add(listener);
    listener(this.entities);

    return () => {
      this.listeners.delete(listener);
    };
  }

  get allEntities(): Readonly<HassEntities> {
    return this.entities;
  }

  getEntity(entityId: string): HassEntity | undefined {
    return this.entities[entityId];
  }

  requireEntity(entityId: string): HassEntity {
    const entity = this.getEntity(entityId);

    if (!entity) {
      throw new Error(`Entity ${entityId} is not present in the latest HA snapshot.`);
    }

    return entity;
  }

  async callDomainService(
    domain: string,
    service: string,
    target: HassServiceTarget,
    serviceData?: Record<string, unknown>,
  ): Promise<void> {
    await callService(this.connection, domain, service, serviceData, target);
  }

  private async startEntitySubscription(): Promise<void> {
    let hasResolvedInitialSnapshot = false;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Timed out after ${INITIAL_SNAPSHOT_TIMEOUT_MS}ms waiting for the initial HA entity snapshot.`,
          ),
        );
      }, INITIAL_SNAPSHOT_TIMEOUT_MS);

      this.unsubscribeEntities = subscribeEntities(
        this.connection,
        (entities: HassEntities) => {
          this.entities = entities;

          if (!hasResolvedInitialSnapshot) {
            hasResolvedInitialSnapshot = true;
            clearTimeout(timer);
            resolve();
          }

          for (const listener of this.listeners) {
            listener(this.entities);
          }
        },
      );
    });
  }
}
