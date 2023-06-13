import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";

function Hero() {
  return (
    <div className="baseVertFlex z-10 gap-4 md:flex-row">
      <div className="lightGlassmorphic baseVertFlex w-5/6 items-start gap-4 rounded-xl p-4 shadow-sm sm:w-auto md:p-8">
        <h1 className="text-left text-4xl font-bold md:text-6xl">
          Welcome to <span className="text-pink-500">Tabsly</span>
        </h1>

        <p className="text-left">
          The{" "}
          <span className="text-pink-500 underline underline-offset-2">
            quickest
          </span>{" "}
          way to transcribe your riffs{" "}
          <span className="text-pink-500 underline underline-offset-2">
            exactly
          </span>{" "}
          as you intend them to sound.
        </p>

        <div className=" flex items-center justify-center gap-4 text-left">
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
