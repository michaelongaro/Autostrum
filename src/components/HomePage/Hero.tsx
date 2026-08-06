import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import HeaderLogo from "~/components/Header/HeaderLogo";
import HeroPlaybackPreview from "~/components/HomePage/HeroPlaybackPreview";
import { Button } from "~/components/ui/button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";

const PROMOTED_TAB_ID = 83;

function Hero() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { data: promotedTab, isFetched: promotedTabFetched } =
    api.search.getMinimalTabById.useQuery(PROMOTED_TAB_ID);

  const { data: fallbackTabs } =
    api.search.getMostRecentAndPopularTabs.useQuery(undefined, {
      enabled: promotedTabFetched && !promotedTab,
    });

  const featuredTab =
    promotedTab ?? fallbackTabs?.mostPopularTabs?.[0] ?? null;

  return (
    <section className="baseVertFlex w-full max-w-[1200px] gap-8 px-4 md:gap-10 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full gap-8 lg:flex-row lg:!items-center lg:!justify-between lg:gap-12">
        <div className="baseVertFlex w-full max-w-xl !items-start gap-5 md:gap-6">
          <div className="baseVertFlex !items-start gap-3 md:gap-4">
            <h1 className="sr-only">Autostrum</h1>
            <HeaderLogo
              width={isAboveMediumViewportWidth ? 320 : 220}
              height={isAboveMediumViewportWidth ? 56 : 38}
            />
            <p className="max-w-lg text-xl font-semibold tracking-tight md:text-2xl lg:text-[1.75rem]">
              Create and share your riffs{" "}
              <span className="italic text-primary underline underline-offset-2">
                exactly
              </span>{" "}
              how you want them to sound
            </p>
            <p className="max-w-md text-sm text-foreground/80 md:text-base">
              Keyboard-first editor, realistic guitar playback, and tools to
              practice what you write.
            </p>
          </div>

          <div className="baseFlex !justify-start gap-3">
            <Button asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/create">
                Create a tab
              </Link>
            </Button>
            <Button variant="outline" asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/explore">
                Explore tabs
              </Link>
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full max-w-md lg:max-w-[440px]"
        >
          <AnimatePresence mode="wait">
            {featuredTab ? (
              <HeroPlaybackPreview
                key={featuredTab.id}
                minimalTab={featuredTab}
              />
            ) : (
              <div
                key="hero-preview-skeleton"
                className="pulseAnimation h-[320px] w-full rounded-xl border md:h-[340px]"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
