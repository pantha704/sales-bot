import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/leads/route";

const validLead = {
  name: "Alex Kim",
  email: "alex@example.com",
  company: "Acme",
  jobTitle: "Sales Enablement",
  query: "Can reps practice discovery calls with an AI sales roleplay?",
  pageHistory: ["/ai-sales-roleplays", "/pricing"],
};

describe("POST /api/leads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("validates the submission", async () => {
    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("runs in transparent mock mode without an n8n webhook", async () => {
    vi.stubEnv("N8N_LEAD_WEBHOOK_URL", "");
    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLead),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("mock");
    expect(body.category).toBe("Sales Bots");
  });

  it("forwards a valid lead to the configured n8n workflow", async () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-webhook-secret");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        leadId: "625f21cc-14a9-45e3-85ac-5932af2557d1",
        category: "Sales Bots",
        reason: "The visitor is evaluating AI sales practice.",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLead),
      }),
    );
    const body = await response.json();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(body.mode).toBe("live");
    expect(body.leadId).toBe("625f21cc-14a9-45e3-85ac-5932af2557d1");
    expect(options.headers).toMatchObject({
      "X-Webhook-Secret": "test-webhook-secret",
    });
  });

  it("still returns live mode when n8n returns HTTP 200 with an empty body", async () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-webhook-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLead),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("live");
    expect(body.responseDegraded).toBe(true);
    expect(body.category).toBe("Sales Bots");
    expect(body.leadId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("does not claim success when the workflow HTTP status fails", async () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-webhook-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("fail", { status: 500 }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLead),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.code).toBe("WORKFLOW_UNAVAILABLE");
  });

  it("fails closed when webhook URL is configured without a secret", async () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "");

    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLead),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("ENV_MISCONFIGURED");
  });
});
