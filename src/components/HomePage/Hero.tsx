import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";

function Hero() {
  return (
    <div className="baseVertFlex z-10 gap-4 md:flex-row">
      <div className="lightGlassmorphic baseVertFlex w-5/6 items-start gap-4 rounded-xl p-4 shadow-sm sm:w-auto md:p-8">
        <h1 className="text-4xl font-bold md:text-6xl">
          Welcome to <span className="text-pink-600">Tabsly</span>
        </h1>

        <p>
          The{" "}
          <span className="italic text-pink-600 underline underline-offset-4">
            quickest
          </span>{" "}
          way to transcribe your riffs{" "}
          <span className="italic text-pink-600 underline underline-offset-4">
            exactly
          </span>{" "}
          as you intend them to sound.
        </p>

        <div className="baseFlex mt-4 gap-4">
          <SignUpButton
            mode="modal"
            afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
          >
            <Button size={"lg"}>Sign up</Button>
          </SignUpButton>
          <SignInButton
            mode="modal"
            afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
          >
            <Button variant={"secondary"} className="h-11">
              Sign in
            </Button>
          </SignInButton>
        </div>
      </div>

      <div className="lightGlassmorphic h-4/6 w-1/2 rounded-xl p-4 shadow-sm md:p-8">
        <div>fill out later</div>
      </div>
    </div>
  );
}

export default Hero;
