"use client";

import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Unable to load this page</h1>
      <p className="mt-2 text-muted-foreground">
        The page could not reach the database. Please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
