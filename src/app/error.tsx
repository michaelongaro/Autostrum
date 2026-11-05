"use client";

import PageErrorFallback from "~/components/errors/PageErrorFallback";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="baseVertFlex w-full">
      <PageErrorFallback />
      <button className="mb-8 underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
