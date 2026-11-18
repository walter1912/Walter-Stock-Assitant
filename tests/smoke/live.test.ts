import { describe, expect, it } from "vitest";

// Hits the deployed server. Run: SMOKE_URL=https://your-app.onrender.com npm run test:smoke
const BASE = process.env.SMOKE_URL?.replace(/\/$/, "");
const get = (path: string, init?: RequestInit) => fetch(`${BASE}${path}`, { redirect: "manual", ...init });

describe.skipIf(!BASE)(`live server ${BASE}`, () => {
  it.each(["/", "/privacy", "/help"])("%s returns 200", async (path) => {
    expect((await get(path)).status).toBe(200);
  }, 60_000); // Render free tier cold start

  it("/auth/login redirects instead of showing a form", async () => {
    expect([301, 302, 303]).toContain((await get("/auth/login")).status);
  });

  it("unknown page is not a 500", async () => {
    expect((await get("/does-not-exist")).status).toBeLessThan(500);
  });

  it.each([
    "app/uninstalled", "app/scopes_update", "customers/data_request", "customers/redact", "shop/redact",
  ])("webhook %s rejects a bad HMAC with 401", async (topic) => {
    const res = await get(`/webhooks/${topic}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Hmac-Sha256": "bad", "X-Shopify-Topic": topic, "X-Shopify-Shop-Domain": "test.myshopify.com" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });
});
