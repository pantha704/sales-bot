"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  LoaderCircle,
  Mail,
  Send,
  Webhook,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  leadProfileResponseSchema,
  type LeadProfileResponse,
} from "@/features/leads/schemas";
import { cn } from "@/lib/utils";

const pageOptions = [
  {
    value: "/ai-sales-roleplays",
    label: "AI Sales Roleplays",
    category: "Sales Bots",
  },
  {
    value: "/sales-coaching",
    label: "Sales Coaching",
    category: "Sales Bots",
  },
  {
    value: "/sales-bot-pricing",
    label: "Sales Bot Pricing",
    category: "Sales Bots",
  },
  {
    value: "/leadership-development",
    label: "Leadership Development",
    category: "Org Development",
  },
  {
    value: "/manager-training",
    label: "Manager Training",
    category: "Org Development",
  },
  {
    value: "/organizational-culture",
    label: "Organizational Culture",
    category: "Org Development",
  },
] as const;

const emptyForm = {
  name: "",
  email: "",
  company: "",
  jobTitle: "",
  query: "",
  pageHistory: [] as string[],
};

const workflowSteps = [
  {
    icon: Webhook,
    title: "Webhook",
    description: "Receives and validates the visitor submission.",
  },
  {
    icon: Bot,
    title: "LLM profile",
    description: "Groq returns one allowed category with a reason.",
  },
  {
    icon: FileSpreadsheet,
    title: "Google Sheets",
    description: "Appends the visitor, context, and classification.",
  },
  {
    icon: Mail,
    title: "Sales email",
    description: "Notifies the team with the profiled lead.",
  },
] as const;

export function LeadProfilerForm() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [result, setResult] = useState<LeadProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField(
    field: "name" | "email" | "company" | "jobTitle" | "query",
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePage(page: string) {
    setForm((current) => ({
      ...current,
      pageHistory: current.pageHistory.includes(page)
        ? current.pageHistory.filter((item) => item !== page)
        : [...current.pageHistory, page],
    }));
  }

  function loadSample(category: "sales" | "organization") {
    setResult(null);
    setError(null);
    setForm(
      category === "sales"
        ? {
            name: "Alex Kim",
            email: "alex@example.com",
            company: "Northstar Labs",
            jobTitle: "Sales Enablement Director",
            query:
              "Can our reps practice discovery calls and difficult objections with an AI sales bot?",
            pageHistory: ["/ai-sales-roleplays", "/sales-coaching"],
          }
        : {
            name: "Priya Shah",
            email: "priya@example.com",
            company: "HelioGrid",
            jobTitle: "People Director",
            query:
              "We need a leadership program for newly promoted managers across our growing team.",
            pageHistory: [
              "/leadership-development",
              "/manager-training",
            ],
          },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "The lead could not be processed.";
        throw new Error(message);
      }

      const parsed = leadProfileResponseSchema.safeParse(body);

      if (!parsed.success) {
        throw new Error("The workflow returned an unexpected result.");
      }

      setResult(parsed.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The lead could not be processed.",
      );
    } finally {
      setStatus("idle");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
      <Card className="border-border/80 bg-card/75 shadow-none backdrop-blur">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest text-primary uppercase">
                Visitor intake
              </p>
              <CardTitle className="mt-1 text-xl">Profile a new lead</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => loadSample("sales")}
                disabled={isSubmitting}
              >
                Sales sample
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => loadSample("organization")}
                disabled={isSubmitting}
              >
                OD sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="lead-name">
                <Input
                  id="lead-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Alex Kim"
                  autoComplete="name"
                  required
                  minLength={2}
                  className="h-10"
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Work email" htmlFor="lead-email">
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="alex@company.com"
                  autoComplete="email"
                  required
                  className="h-10"
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Company" htmlFor="lead-company">
                <Input
                  id="lead-company"
                  value={form.company}
                  onChange={(event) =>
                    updateField("company", event.target.value)
                  }
                  placeholder="Northstar Labs"
                  autoComplete="organization"
                  required
                  minLength={2}
                  className="h-10"
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Job title" htmlFor="lead-title" optional>
                <Input
                  id="lead-title"
                  value={form.jobTitle}
                  onChange={(event) =>
                    updateField("jobTitle", event.target.value)
                  }
                  placeholder="Sales Enablement Director"
                  autoComplete="organization-title"
                  className="h-10"
                  disabled={isSubmitting}
                />
              </Field>
            </div>

            <fieldset className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <legend className="text-sm font-medium">Pages visited</legend>
                <span className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Simulated browsing history sent to the classifier
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {pageOptions.map((page) => {
                  const checked = form.pageHistory.includes(page.value);

                  return (
                    <label
                      key={page.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/80 bg-background/35 hover:bg-muted/50",
                        isSubmitting && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePage(page.value)}
                        disabled={isSubmitting}
                        className="mt-0.5 size-4 accent-[var(--primary)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {page.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {page.category}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Question or message"
              htmlFor="lead-query"
              hint="Tell us what the visitor is looking for"
            >
              <Textarea
                id="lead-query"
                value={form.query}
                onChange={(event) => updateField("query", event.target.value)}
                placeholder="We want our sales team to practice difficult discovery calls…"
                required
                minLength={10}
                maxLength={1_000}
                className="min-h-28 resize-y"
                disabled={isSubmitting}
              />
            </Field>

            {error ? (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                At least one visited page is required.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || form.pageHistory.length === 0}
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send aria-hidden="true" />
                )}
                {isSubmitting ? "Running workflow…" : "Profile lead"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-border/80 bg-card/65 shadow-none">
          <CardHeader>
            <p className="text-xs font-medium tracking-widest text-primary uppercase">
              Automation path
            </p>
            <CardTitle className="mt-1 text-base">
              Zero manual work between steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {workflowSteps.map(({ icon: Icon, title, description }, index) => (
              <div key={title}>
                <div className="flex gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
                {index < workflowSteps.length - 1 ? (
                  <div className="ml-4 h-4 w-px bg-border" />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <div aria-live="polite">
          {result ? (
            <Card className="border-primary/30 bg-primary/8 shadow-none">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <Badge
                  variant={result.mode === "live" ? "default" : "secondary"}
                >
                  {result.mode === "live" ? "n8n live" : "Demo mode"}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Classified as
              </p>
              <CardTitle className="text-xl">{result.category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {result.reason}
              </p>
              <div className="rounded-lg border border-border/80 bg-background/40 p-3 font-mono text-[0.68rem] text-muted-foreground">
                Lead ID: {result.leadId}
              </div>
              {result.mode === "mock" ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Add the production n8n webhook to run Sheets and Gmail.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-primary">
                  Sheet updated and sales notification sent
                  <ArrowRight className="size-3" aria-hidden="true" />
                </p>
              )}
            </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
              <Bot
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium">
                Classification appears here
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use either sample to test both required categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-muted-foreground">
              (optional)
            </span>
          ) : null}
        </label>
        {hint ? (
          <span className="hidden text-[0.68rem] text-muted-foreground sm:block">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
