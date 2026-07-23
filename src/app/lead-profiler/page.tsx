import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadProfilerForm } from "@/features/leads/lead-profiler-form";

export const metadata = {
  title: "Lead Profiler",
};

export default function LeadProfilerPage() {
  return (
    <main className="surface-grid min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link href="/" />}
              aria-label="Back to home"
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Route className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">CloseLoop</h1>
              <p className="text-xs text-muted-foreground">Lead profiler</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/5 text-primary"
          >
            n8n workflow
          </Badge>
        </header>
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-primary uppercase">
            Visitor to sales-ready lead
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Turn browsing intent into the right conversation.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Submit visitor details, their message, and simulated page history.
            The workflow classifies the lead, stores it, and alerts sales.
          </p>
        </div>
        <LeadProfilerForm />
      </div>
    </main>
  );
}
