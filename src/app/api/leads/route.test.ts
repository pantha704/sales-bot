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
    expect(options.headers).toMatchObject({
      "X-Webhook-Secret": "test-webhook-secret",
    });
  });

  it("does not claim success when the workflow returns invalid data", async () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-webhook-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ success: true })),
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
