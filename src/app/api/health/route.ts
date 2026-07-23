import { getProviderAvailability } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "closeloop",
    providers: getProviderAvailability(),
    timestamp: new Date().toISOString(),
  });
}
