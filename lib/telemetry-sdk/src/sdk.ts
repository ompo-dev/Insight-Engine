import type {
  LynxClient,
  LynxClientOptions,
  LynxCollectionWriteOptions,
  LynxCollectionWritePayload,
  LynxEventPayload,
  LynxFeatureExposurePayload,
  LynxFlushResult,
  LynxIdentityPayload,
  LynxLogPayload,
  LynxPagePayload,
  LynxRequestPayload,
  LynxRevenuePayload,
} from "./types";

type QueueItem =
  | { kind: "event"; payload: LynxEventPayload }
  | { kind: "page"; payload: LynxPagePayload }
  | { kind: "identify"; payload: LynxIdentityPayload }
  | { kind: "revenue"; payload: LynxRevenuePayload }
  | { kind: "log"; payload: LynxLogPayload }
  | { kind: "request"; payload: LynxRequestPayload }
  | { kind: "feature-exposure"; payload: LynxFeatureExposurePayload };

function trimSlash(input: string) {
  return input.replace(/\/+$/, "");
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Lynx SDK request failed (${response.status}): ${errorText}`);
  }
}

export function createLynxClient(options: LynxClientOptions): LynxClient {
  const host = trimSlash(options.host);
  const headers = {
    "x-api-key": options.apiKey,
    ...options.headers,
  };
  const flushAt = options.flushAt ?? 10;
  const flushIntervalMs = options.flushIntervalMs ?? 2500;

  let queue: QueueItem[] = [];
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  const ensureInterval = () => {
    if (intervalHandle) return;
    intervalHandle = setInterval(() => {
      void flush();
    }, flushIntervalMs);
  };

  const enqueue = async (item: QueueItem) => {
    queue.push(item);
    ensureInterval();
    if (queue.length >= flushAt) {
      await flush();
    }
  };

  const flush = async (): Promise<LynxFlushResult> => {
    if (!queue.length) return { sent: 0 };

    const current = [...queue];
    queue = [];

    const events = current
      .filter((item): item is Extract<QueueItem, { kind: "event" }> => item.kind === "event")
      .map((item) => ({
        name: item.payload.event,
        sessionId: item.payload.sessionId,
        userId: item.payload.distinctId,
        anonymousId: item.payload.anonymousId,
        properties: {
          ...item.payload.properties,
          environment: options.environment,
          release: options.release,
        },
        timestamp: item.payload.timestamp,
        url: item.payload.url,
        referrer: item.payload.referrer,
      }));

    const pages = current
      .filter((item): item is Extract<QueueItem, { kind: "page" }> => item.kind === "page")
      .map((item) => ({
        name: "$pageview",
        properties: {
          title: item.payload.title,
          ...item.payload.properties,
          environment: options.environment,
          release: options.release,
        },
        timestamp: item.payload.timestamp,
        url: item.payload.url,
        referrer: item.payload.referrer,
      }));

    const identities = current.filter(
      (item): item is Extract<QueueItem, { kind: "identify" }> => item.kind === "identify",
    );
    const revenue = current.filter(
      (item): item is Extract<QueueItem, { kind: "revenue" }> => item.kind === "revenue",
    );
    const logs = current.filter((item): item is Extract<QueueItem, { kind: "log" }> => item.kind === "log");
    const requests = current.filter(
      (item): item is Extract<QueueItem, { kind: "request" }> => item.kind === "request",
    );
    const exposures = current.filter(
      (item): item is Extract<QueueItem, { kind: "feature-exposure" }> => item.kind === "feature-exposure",
    );

    const operations: Promise<unknown>[] = [];

    if (events.length || pages.length) {
      operations.push(
        postJson(`${host}/projects/${options.projectId}/events`, { events: [...events, ...pages] }, headers),
      );
    }

    for (const entry of revenue) {
      operations.push(postJson(`${host}/projects/${options.projectId}/revenue/events`, entry.payload, headers));
    }

    for (const entry of logs) {
      operations.push(
        postJson(
          `${host}/projects/${options.projectId}/logs`,
          {
            entries: [
              {
                level: entry.payload.level,
                message: entry.payload.message,
                service: entry.payload.service,
                traceId: entry.payload.traceId,
                timestamp: entry.payload.timestamp,
                meta: entry.payload.metadata,
              },
            ],
          },
          headers,
        ),
      );
    }

    for (const entry of requests) {
      operations.push(
        postJson(
          `${host}/projects/${options.projectId}/requests`,
          {
            requests: [
              {
                method: entry.payload.method,
                url: entry.payload.url,
                statusCode: entry.payload.statusCode,
                duration: entry.payload.duration,
                traceId: entry.payload.traceId,
                error: entry.payload.error,
                timestamp: entry.payload.timestamp,
              },
            ],
          },
          headers,
        ),
      );
    }

    for (const entry of identities) {
      operations.push(
        postJson(
          `${host}/projects/${options.projectId}/collections/identities/ingest`,
          {
            payloads: [
              {
                distinctId: entry.payload.distinctId,
                traits: entry.payload.traits ?? {},
                groups: entry.payload.groups ?? {},
              },
            ],
          },
          headers,
        ),
      );
    }

    for (const entry of exposures) {
      operations.push(
        postJson(
          `${host}/projects/${options.projectId}/collections/feature_exposures/ingest`,
          {
            payloads: [
              {
                flagKey: entry.payload.flagKey,
                variant: entry.payload.variant ?? null,
                distinctId: entry.payload.distinctId ?? null,
                properties: entry.payload.properties ?? {},
                timestamp: entry.payload.timestamp,
              },
            ],
          },
          headers,
        ),
      );
    }

    await Promise.all(operations);
    return { sent: current.length };
  };

  const send = async (
    collectionSlug: string,
    payload: LynxCollectionWritePayload,
    writeOptions?: LynxCollectionWriteOptions,
  ) => {
    await postJson(
      `${host}/projects/${options.projectId}/collections/${collectionSlug}/ingest`,
      {
        payloads: [
          {
            ...payload,
            timestamp: writeOptions?.timestamp ?? (payload.timestamp as string | undefined),
          },
        ],
      },
      headers,
    );
  };

  const batchSend = async (
    collectionSlug: string,
    payloads: LynxCollectionWritePayload[],
    writeOptions?: LynxCollectionWriteOptions,
  ) => {
    await postJson(
      `${host}/projects/${options.projectId}/collections/${collectionSlug}/ingest`,
      {
        payloads: payloads.map((payload) => ({
          ...payload,
          timestamp: writeOptions?.timestamp ?? (payload.timestamp as string | undefined),
        })),
      },
      headers,
    );
  };

  const nodes = new Proxy({} as LynxClient["nodes"], {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return {
        send: (payload: LynxCollectionWritePayload, writeOptions?: LynxCollectionWriteOptions) =>
          send(prop, payload, writeOptions),
        batchSend: (payloads: LynxCollectionWritePayload[], writeOptions?: LynxCollectionWriteOptions) =>
          batchSend(prop, payloads, writeOptions),
      };
    },
  });

  return {
    captureEvent: (payload) => enqueue({ kind: "event", payload }),
    page: (payload) => enqueue({ kind: "page", payload }),
    identify: (payload) => enqueue({ kind: "identify", payload }),
    captureRevenue: (payload) => enqueue({ kind: "revenue", payload }),
    captureLog: (payload) => enqueue({ kind: "log", payload }),
    captureRequest: (payload) => enqueue({ kind: "request", payload }),
    captureFeatureExposure: (payload) => enqueue({ kind: "feature-exposure", payload }),
    send,
    batchSend,
    writeToCollection: send,
    batchWriteToCollection: batchSend,
    nodes,
    flush,
    reset() {
      queue = [];
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    },
  };
}
