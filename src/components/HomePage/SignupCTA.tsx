import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";

function SignupCTA() {
  const { isSignedIn } = useAuth();

  return (
    <section className="baseVertFlex w-full max-w-[1200px] px-4 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full gap-5 rounded-xl border bg-background px-6 py-10 text-center shadow-md md:gap-6 md:px-12 md:py-14">
        <div className="baseVertFlex max-w-2xl gap-2 md:gap-3">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Publish your first tab free
          </h2>
          <p className="text-sm text-foreground/80 md:text-base">
            Sign up, finish your profile, and share a public link — no guesswork
            on how it should sound.
          </p>
        </div>

        <div className="baseFlex flex-wrap gap-3">
          {isSignedIn ? (
            <Button asChild size="lg" className="px-8">
              <Link prefetch={false} href="/create">
                Create your next tab
              </Link>
            </Button>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button size="lg" className="px-8">
                  Sign up free
                </Button>
              </SignInButton>
              <Button variant="outline" asChild size="lg" className="px-8">
                <Link prefetch={false} href="/create">
                  Start creating
                </Link>
              </Button>
            </>
          )}
        </div>

        {!isSignedIn && (
          <p className="text-xs text-foreground/65 md:text-sm">
            Keep drafts as you go — pick up where you left off after you sign
            in.
          </p>
        )}
      </div>
    </section>
  );
}

export default SignupCTA;
