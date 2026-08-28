import Link from "next/link";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import Image from "next/image";

import tabMetadataScreenshot from "public/homepage/signupPromo/second.png";
import { BsFillPlayFill } from "react-icons/bs";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import { GiMusicalScore } from "react-icons/gi";
import { FaEye } from "react-icons/fa6";
import { ChevronDown } from "lucide-react";

function SignupCTA() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) return null;

  return (
    <section className="baseFlex w-full max-w-[1200px] !justify-between rounded-xl border bg-background shadow-md">
      <div className="baseVertFlex w-full gap-5 px-6 py-10 text-center md:gap-6 md:px-12 md:py-14">
        <div className="baseVertFlex max-w-sm gap-2 md:gap-3">
          <h2 className="text-left text-2xl font-bold tracking-tight md:text-3xl">
            Sign up today for free and publish your first tab
          </h2>
          <p className="text-left text-sm text-foreground/80 md:text-base">
            Feel free to explore our tab editor first, your progress will be
            saved when you finish signing up!
          </p>
        </div>

        <div className="baseFlex flex-wrap gap-3">
          <SignUpButton mode="modal">
            <Button size="lg" className="px-8">
              Sign up
            </Button>
          </SignUpButton>
          <Button variant="outline" asChild size="lg" className="px-8">
            <Link prefetch={false} href="/create">
              Start creating
            </Link>
          </Button>
        </div>
      </div>

      {/* <div
        // style={{
        //   width: getDynamicWidth(),
        //   height: getDynamicHeight(),
        // }}
        className="relative grid size-full grid-cols-1 grid-rows-1"
      >
        <Image
          src={tabMetadataScreenshot}
          alt={`screenshot of`}
          // fill
          sizes="1000px"
          // sizes={`(max-width: 768px) 100vw, ${getDynamicWidth()}px`}
          className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 rounded-r-2xl object-cover object-center !transition-all"
        />

        <div
          // style={{
          //   backgroundColor: "hsl(var(--screenshot-secondary) / 0.5)",
          // }}
          className="absolute inset-0 z-10 size-full bg-primary/50 mix-blend-color"
        ></div>
      </div> */}

      <TopRightTabMetadataPreview />
    </section>
  );
}

export default SignupCTA;

function TopRightTabMetadataPreview() {
  return (
    <div className="playbackModalGradient pointer-events-none h-[450px] w-[750px] select-none overflow-hidden rounded-r-xl pr-16 pt-16 [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_50%)] [mask-image:linear-gradient(to_right,transparent_0%,black_50%)]">
      <div className="baseFlex w-full !justify-end gap-4 pb-4">
        <BsFillPlayFill className="size-9 -rotate-12" />
        <QuarterNote className="size-9 rotate-12" />
        <GiMusicalScore className="size-9 -rotate-12" />
        <EighthNote className="size-9 rotate-12" viewBox="20 170 110 210" />
      </div>

      <div className="baseVertFlex relative z-10 size-full rounded-tr-xl border-r border-t bg-background">
        <div className="baseFlex absolute right-4 top-4 gap-3">
          <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground !shadow-primaryButton">
            <FaEye className="size-4" />
            Preview
          </div>
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground !shadow-primaryButton">
            Publish
          </div>
        </div>

        <div className="baseVertFlex gap-4 pr-32">
          <div className="baseFlex gap-8">
            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Genre</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                Rock
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Tuning</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                E A D G B E
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Capo</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                3rd fret
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>
          </div>

          <div className="baseFlex gap-8">
            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Difficulty</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                Intermediate
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Tempo</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                75
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Key</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                D major
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
