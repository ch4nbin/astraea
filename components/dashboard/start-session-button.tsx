"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onStart = () => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to create session");
        }

        const data = (await response.json()) as {
          session: { id: string };
        };
        router.push(`/session/${data.session.id}`);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unexpected error while creating session",
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onStart}
        disabled={isPending}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Starting..." : "Start New Session"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
