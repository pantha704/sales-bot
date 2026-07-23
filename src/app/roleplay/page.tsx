import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleplayStudio } from "@/features/roleplay/roleplay-studio";

export const metadata = {
  title: "Sales Roleplay",
};

export default function RoleplayPage() {
  return (
    <main className="surface-grid min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-5 flex items-center justify-between gap-4">
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
              <p className="text-xs text-muted-foreground">
                Sales roleplay studio
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/5 text-primary"
          >
            Voice practice
          </Badge>
        </header>
        <RoleplayStudio />
      </div>
    </main>
  );
}
