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
    client.startEntitySubscription();
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

  private startEntitySubscription(): void {
    this.unsubscribeEntities = subscribeEntities(
      this.connection,
      (entities: HassEntities) => {
        this.entities = entities;

        for (const listener of this.listeners) {
          listener(this.entities);
        }
      },
    );
  }
}
