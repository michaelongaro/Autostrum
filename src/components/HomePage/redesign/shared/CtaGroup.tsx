import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { cn } from "~/utils/cn";

type CtaGroupProps = {
  className?: string;
  layout?: "row" | "stack";
  showSecondary?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
};

function CtaGroup({
  className,
  layout = "row",
  showSecondary = true,
  primaryLabel = "Create a tab",
  secondaryLabel = "Explore tabs",
}: CtaGroupProps) {
  return (
    <div
      className={cn(
        "baseFlex gap-3",
        layout === "stack" ? "flex-col sm:flex-row" : "flex-wrap",
        className,
      )}
    >
      <Button asChild size="lg" className="min-w-[148px]">
        <Link href="/create">{primaryLabel}</Link>
      </Button>
      <Button asChild variant="secondary" size="lg" className="min-w-[148px]">
        <Link href="/explore">{secondaryLabel}</Link>
      </Button>
      {showSecondary && (
        <>
          <Button asChild variant="outline" size="lg">
            <Link href="/tools">Tools</Link>
          </Button>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="lg">
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild variant="ghost" size="lg">
              <Link href="/profile/tabs/filters">Your tabs</Link>
            </Button>
          </SignedIn>
        </>
      )}
    </div>
  );
}

export default CtaGroup;
