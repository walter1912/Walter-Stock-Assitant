import { vi } from "vitest";

// Server-only modules: pages import them for loaders/actions, tests never call them.
vi.mock("../app/inbox.server", () => ({
  authenticatedQuery: vi.fn(),
  loadAuthenticatedInbox: vi.fn(),
}));
vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: () => ({}), error: (e: unknown) => { throw e; } },
}));
vi.mock("@shopify/app-bridge-react", () => ({
  useAppBridge: () => ({ toast: { show: vi.fn() } }),
}));

// jsdom's AbortSignal is not the one Node's fetch Request accepts. Drop it in tests.
if (typeof window !== "undefined") {
  const NodeRequest = globalThis.Request;
  globalThis.Request = class extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, { ...init, signal: undefined });
    }
  } as typeof Request;
}
