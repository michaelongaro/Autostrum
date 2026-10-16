import Link from "next/link";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { BsFillPlayFill } from "react-icons/bs";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import { GiMusicalScore } from "react-icons/gi";
import { FaEye } from "react-icons/fa6";
import { ChevronDown, ChevronsUpDown } from "lucide-react";

function SignupCTA() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) return null;

  return (
    <section className="baseVertFlex w-full max-w-[1135px] !justify-between overflow-hidden border-y bg-background shadow-md sm:rounded-xl sm:border-x md:!flex-row">
      <MobileTabMetadataPreview />

      <div className="baseVertFlex mt-4 w-full gap-5 px-6 pb-10 pt-6 text-center md:mt-0 md:gap-6 md:px-12 md:py-10">
        <div className="baseVertFlex max-w-sm gap-2 md:gap-3">
          <h2 className="text-left text-2xl font-bold tracking-tight md:text-3xl">
            Sign up today for free and publish your first tab
          </h2>
          <p className="text-left text-sm text-foreground/80 md:text-base">
            Feel free to explore our tab editor first, your progress will be
            saved when you finish signing up!
          </p>
        </div>

        <div className="baseFlex w-full max-w-sm flex-wrap !justify-start gap-3">
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

      <TopRightTabMetadataPreview />
    </section>
  );
}

export default SignupCTA;

function MobileTabMetadataPreview() {
  return (
    <div
      aria-hidden="true"
      className="playbackModalGradient pointer-events-none relative h-[350px] w-full select-none overflow-hidden pt-6 [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] sm:px-6 md:hidden"
    >
      <div className="mx-auto max-w-sm">
        <div className="baseFlex !justify-between gap-4 px-4 pb-4 pt-4">
          <p className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Create
          </p>
          <div className="baseFlex mr-1">
            <div className="relative right-[-18px] top-[3px] z-30 rotate-[-6deg] rounded-lg border bg-background p-2 shadow-sm">
              <BsFillPlayFill className="size-6" />
            </div>

            <div className="relative right-[-12px] z-20 -rotate-3 rounded-lg border bg-background p-2 shadow-sm">
              <QuarterNote className="size-6" />
            </div>

            <div className="relative right-[-6px] z-10 rotate-3 rounded-lg border bg-background p-2 shadow-sm">
              <GiMusicalScore className="size-6" />
            </div>

            <div className="relative top-[3px] rotate-[6deg] rounded-lg border bg-background p-2 shadow-sm">
              <EighthNote className="size-6" viewBox="20 170 110 210" />
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full border-y bg-background shadow-sm sm:rounded-xl sm:border-x">
          <div className="baseFlex !justify-end gap-3 p-4">
            <TabPreviewActions />
          </div>

          <div className="baseVertFlex mt-8 w-full gap-4 px-4 pb-6">
            <div className="baseVertFlex w-full !items-start gap-1">
              <div className="baseFlex gap-1 text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </div>
              <div className="relative h-10 w-full rounded-md border">
                <span className="absolute left-3 top-[10px] text-sm text-foreground/50">
                  My new tab
                </span>
              </div>
            </div>

            <div className="baseVertFlex w-full !items-start gap-1">
              <div className="baseFlex text-sm font-medium">Artist</div>
              <div className="relative h-10 w-full rounded-md border">
                <span className="absolute left-3 top-[10px] text-sm">
                  Select artist...
                </span>
                <div className="absolute right-3 top-[12px]">
                  <ChevronsUpDown className="size-4" />
                </div>
              </div>
            </div>

            <div className="baseVertFlex w-full !items-start gap-1">
              <div className="baseFlex gap-1 text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </div>
              <div className="relative h-10 w-full rounded-md border">
                <span className="absolute left-3 top-[10px] text-sm text-foreground/50">
                  My new tab
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopRightTabMetadataPreview() {
  return (
    <div
      aria-hidden="true"
      className="playbackModalGradient pointer-events-none relative hidden h-[390px] w-[750px] select-none overflow-hidden rounded-r-xl pr-16 pt-12 [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_50%)] [mask-image:linear-gradient(to_right,transparent_0%,black_50%)] md:block"
    >
      <div className="baseFlex w-full !justify-end gap-4 pb-4">
        <TabPreviewIcons />
      </div>

      <div className="baseVertFlex relative z-10 size-full rounded-tr-xl border-r border-t bg-background">
        <div className="baseFlex absolute right-4 top-4 gap-3">
          <TabPreviewActions />
        </div>

        <div className="baseVertFlex gap-4 pr-32">
          <div className="baseFlex gap-8">
            <TabPreviewField label="Genre" value="Rock" />
            <TabPreviewField label="Tuning" value="E A D G B E" />
            <TabPreviewField label="Capo" value="3rd fret" />
          </div>

          <div className="baseFlex gap-8">
            <TabPreviewField label="Difficulty" value="Intermediate" />
            <TabPreviewField label="Tempo" value="75" select={false} />
            <TabPreviewField label="Key" value="D major" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPreviewIcons() {
  return (
    <>
      <BsFillPlayFill className="size-7 -rotate-12 md:size-9" />
      <QuarterNote className="size-7 rotate-12 md:size-9" />
      <GiMusicalScore className="size-7 -rotate-12 md:size-9" />
      <EighthNote
        className="size-7 rotate-12 md:size-9"
        viewBox="20 170 110 210"
      />
    </>
  );
}

function TabPreviewActions() {
  return (
    <>
      <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground !shadow-primaryButton">
        <FaEye className="size-4" />
        Preview
      </div>
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground !shadow-primaryButton">
        Publish
      </div>
    </>
  );
}

function TabPreviewField({
  label,
  value,
  select = true,
}: {
  label: string;
  value: string;
  select?: boolean;
}) {
  return (
    <div className="baseVertFlex min-w-0 !items-start gap-2">
      <div className="text-xs font-medium leading-none md:text-sm">{label}</div>
      <div className="border-input flex h-10 w-full items-center justify-between gap-2 text-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-xs md:text-sm">
        {value}
        {select ? <ChevronDown className="size-4 shrink-0 opacity-50" /> : null}
      </div>
    </div>
  );
}
