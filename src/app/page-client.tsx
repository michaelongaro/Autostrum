"use client";

import Link from "next/link";
import { BsGridFill } from "react-icons/bs";
import GenreCards from "~/components/Explore/GenreCards";
import CustomizeLook from "~/components/HomePage/CustomizeLook";
import FAQ from "~/components/HomePage/FAQ";
import FeatureShowcase from "~/components/HomePage/FeatureShowcase";
import Hero from "~/components/HomePage/Hero";
import SignupCTA from "~/components/HomePage/SignupCTA";
import TabDiscovery from "~/components/HomePage/TabDiscovery";
import TabMarquee from "~/components/HomePage/TabMarquee";
import ToolsShowcase from "~/components/HomePage/ToolsShowcase";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

function Home() {
  return (
    // Show server-rendered content immediately rather than fading the entire
    // image grid through an additional compositing layer during hydration.
    <div className="baseVertFlex w-full gap-16 overflow-x-clip pb-16 md:gap-24 md:pb-24">
      <div className="baseVertFlex w-full">
        <Hero />

        <div className="baseVertFlex w-full max-w-[1150px] !items-start gap-4 px-4 xl:px-0">
          <div className="baseFlex w-full !items-baseline !justify-between gap-2">
            <div className="baseVertFlex max-w-2xl gap-2">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Genres
              </h2>
            </div>

            <Button
              role="link"
              variant="link"
              className="!h-auto !px-0 text-foreground"
              nativeButton={false}
              render={
                <Link prefetch={false} href="/search/filters">
                  View all tabs
                </Link>
              }
            />
          </div>

          <div className="grid w-full grid-cols-2 place-items-center gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            <GenreCards />
          </div>
        </div>
      </div>

      <FeatureShowcase />

      {/* <TabDiscovery /> */}
      {/* <TabMarquee /> */}
      <ToolsShowcase />
      {/* <SignupCTA />
      <CustomizeLook /> */}
      <FAQ />
    </div>
  );
}

export default Home;
