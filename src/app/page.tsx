import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Mic2,
  Route,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const capabilities = [
  {
    icon: Mic2,
    title: "Voice-first practice",
    description:
      "Speak naturally, hear the buyer respond, and keep a readable transcript.",
  },
  {
    icon: Bot,
    title: "Configurable buyers",
    description:
      "Change the role, industry, personality, objections, and difficulty.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by design",
    description:
      "API keys remain server-side with validation and graceful fallbacks.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="surface-grid min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg text-sm font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Route className="size-5" aria-hidden="true" />
            </span>
            CloseLoop
          </Link>
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/5 text-primary"
          >
            Assignment build
          </Badge>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20 lg:py-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              Practice the conversation before it counts
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Meet the buyer who will challenge your pitch.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              A configurable AI sales roleplay that listens, responds in
              character, and gives you a clean transcript to review.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/roleplay" />}
              >
                Start a roleplay
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/lead-profiler" />}
              >
                <Workflow className="size-4" aria-hidden="true" />
                Lead profiler
              </Button>
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="border-border/80 bg-card/65 shadow-none backdrop-blur"
              >
                <CardHeader>
                  <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="leading-6">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Built for Eubrics Automation Engineer assignment</span>
          <span className="font-mono">Next.js 16 · TypeScript · n8n</span>
        </footer>
      </div>
    </main>
  );
}
