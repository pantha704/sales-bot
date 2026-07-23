import {
  leadSubmissionSchema,
  n8nLeadResponseSchema,
} from "@/features/leads/schemas";
import { profileLeadLocally } from "@/features/leads/mock-profiler";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Check the lead details and try again.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const env = getServerEnv();
  const leadId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();

  if (!env.N8N_LEAD_WEBHOOK_URL) {
    return Response.json(
      {
        leadId,
        ...profileLeadLocally(parsed.data),
        mode: "mock",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(env.N8N_LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.N8N_WEBHOOK_SECRET
          ? { "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        leadId,
        submittedAt,
        source: "closeloop-web-form",
        ...parsed.data,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => null);
    const profiled = n8nLeadResponseSchema.safeParse(payload);

    if (!response.ok || !profiled.success) {
      throw new Error("The workflow returned an invalid response.");
    }

    return Response.json(
      {
        leadId: profiled.data.leadId,
        category: profiled.data.category,
        reason: profiled.data.reason,
        mode: "live",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "The lead workflow is temporarily unavailable. No submission was claimed as saved.",
        code: "WORKFLOW_UNAVAILABLE",
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
