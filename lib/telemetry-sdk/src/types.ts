export interface LynxClientOptions {
  apiKey: string;
  projectId: string;
  host: string;
  environment?: string;
  release?: string;
  flushAt?: number;
  flushIntervalMs?: number;
  headers?: Record<string, string>;
}

export interface LynxCollectionWriteOptions {
  timestamp?: string;
}

export type LynxCollectionWritePayload = Record<string, unknown>;

export interface LynxEventPayload {
  event: string;
  distinctId?: string;
  anonymousId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  url?: string;
  referrer?: string;
}

export interface LynxPagePayload {
  url: string;
  title?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

export interface LynxIdentityPayload {
  distinctId: string;
  traits?: Record<string, unknown>;
  groups?: Record<string, string>;
}

export interface LynxRevenuePayload {
  type: string;
  amount: number;
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  plan?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface LynxLogPayload {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service?: string;
  traceId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface LynxRequestPayload {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  traceId?: string;
  error?: string;
  timestamp?: string;
}

export interface LynxFeatureExposurePayload {
  flagKey: string;
  variant?: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

export interface LynxFlushResult {
  sent: number;
}

export interface LynxNodeClient {
  send: (payload: LynxCollectionWritePayload, options?: LynxCollectionWriteOptions) => Promise<void>;
  batchSend: (payloads: LynxCollectionWritePayload[], options?: LynxCollectionWriteOptions) => Promise<void>;
}

export interface LynxClient {
  captureEvent: (payload: LynxEventPayload) => Promise<void>;
  page: (payload: LynxPagePayload) => Promise<void>;
  identify: (payload: LynxIdentityPayload) => Promise<void>;
  captureRevenue: (payload: LynxRevenuePayload) => Promise<void>;
  captureLog: (payload: LynxLogPayload) => Promise<void>;
  captureRequest: (payload: LynxRequestPayload) => Promise<void>;
  captureFeatureExposure: (payload: LynxFeatureExposurePayload) => Promise<void>;
  send: (collectionSlug: string, payload: LynxCollectionWritePayload, options?: LynxCollectionWriteOptions) => Promise<void>;
  batchSend: (collectionSlug: string, payloads: LynxCollectionWritePayload[], options?: LynxCollectionWriteOptions) => Promise<void>;
  writeToCollection: (collectionSlug: string, payload: LynxCollectionWritePayload, options?: LynxCollectionWriteOptions) => Promise<void>;
  batchWriteToCollection: (collectionSlug: string, payloads: LynxCollectionWritePayload[], options?: LynxCollectionWriteOptions) => Promise<void>;
  nodes: Record<string, LynxNodeClient>;
  flush: () => Promise<LynxFlushResult>;
  reset: () => void;
}
