import Link from "next/link";
import { type ReactNode } from "react";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { Button, buttonVariants } from "~/components/ui/button";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { BsFillPlayFill } from "react-icons/bs";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import { genreColors } from "~/utils/genreColors";
import { GiMusicalScore } from "react-icons/gi";
import { FaEye } from "react-icons/fa";
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
      className="heroScreenshotStage playbackModalGradient pointer-events-none relative h-[350px] w-full select-none overflow-hidden px-4 pt-6 [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] sm:px-6 md:hidden"
    >
      <div className="heroScreenshotTilt mx-auto max-w-sm">
        <div className="baseFlex !justify-between gap-2 px-1 pb-4 pt-4 xs:gap-4 xs:px-4">
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

        <div className="heroScreenshotApp relative z-10 w-full bg-background">
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

      <div className="absolute bottom-0 left-0 right-16 top-[100px] z-10 rounded-tr-xl border-r border-t bg-background">
        <div className="baseFlex absolute right-4 top-4 gap-3">
          <TabPreviewActions />
        </div>

        {/* Keep the wide desktop editor's columns at full size inside the crop. */}
        <div className="absolute right-16 top-24 grid grid-cols-[183px_143px_112px] items-start gap-4">
          <TabPreviewField label="Genre" required>
            <TabPreviewSelect className="w-[180px]">
              <div className="baseFlex gap-2">
                <div
                  className="size-3 rounded-full"
                  style={{
                    backgroundColor: genreColors.get("Rock"),
                    boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                  }}
                />
                Rock
              </div>
            </TabPreviewSelect>
          </TabPreviewField>

          <TabPreviewField label="Tuning" required>
            <TabPreviewSelect className="w-[135px]">
              <PrettyTuning tuning="e2 a2 d3 g3 b3 e4" displayWithFlex />
            </TabPreviewSelect>
          </TabPreviewField>

          <TabPreviewField label="Capo">
            <TabPreviewSelect className="w-28">3rd fret</TabPreviewSelect>
          </TabPreviewField>

          <TabPreviewField label="Difficulty" required>
            <TabPreviewSelect className="w-[180px]">
              <div className="baseFlex gap-2">
                <DifficultyBars difficulty={3} />
                Intermediate
              </div>
            </TabPreviewSelect>
          </TabPreviewField>

          <TabPreviewField label="Tempo" required>
            <div className="baseFlex">
              <QuarterNote className="-ml-1 size-5" />
              <div className="border-input flex h-10 w-[53px] items-center rounded-md border bg-transparent px-3 py-2 text-base">
                115
              </div>
              <span className="ml-1">BPM</span>
            </div>
          </TabPreviewField>

          <TabPreviewField label="Key">
            <TabPreviewSelect>D major</TabPreviewSelect>
          </TabPreviewField>
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
      <div
        className={buttonVariants({
          variant: "secondary",
          className: "gap-2",
        })}
      >
        <FaEye className="size-4 shrink-0" />
        Preview
      </div>
      <div className={buttonVariants({ className: "w-[124px] md:w-[132px]" })}>
        Publish
      </div>
    </>
  );
}

function TabPreviewField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="baseVertFlex !items-start gap-1.5">
      <div className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </div>
      {children}
    </div>
  );
}

function TabPreviewSelect({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-input flex h-10 items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm ${className}`}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 opacity-50" />
    </div>
  );
}
