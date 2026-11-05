"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <h1>Autostrum is temporarily unavailable</h1>
        <p>Please try again.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
