import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import {
  PickLogo,
  TabStaff,
  VARIATION_META,
} from "~/components/HomepageVariations/shared";

function HomepageVariationsGallery() {
  return (
    <motion.div
      key="variations-gallery"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="baseVertFlex z-10 w-full px-4 py-16 md:py-24"
    >
      <Head>
        <title>Autostrum — Homepage Explorations</title>
        <meta name="description" content="Ten homepage design explorations for Autostrum." />
      </Head>

      <div className="baseVertFlex w-full max-w-5xl gap-3 text-center">
        <PickLogo size={44} />
        <h1 className="text-balance text-3xl font-bold md:text-4xl">
          Homepage explorations
        </h1>
        <p className="max-w-xl text-pretty text-foreground/70">
          Ten distinct directions for the Autostrum homepage. Each reuses your
          theme, logo, and tab language, so any of them can drop straight into
          the current color system.
        </p>
      </div>

      <div className="mt-12 grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VARIATION_META.map((variation, i) => (
          <Link
            key={variation.id}
            href={`/homepage-variations/${variation.id}`}
            className="group baseVertFlex !items-stretch overflow-hidden rounded-xl border bg-secondary/40 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
          >
            <div className="relative h-32 w-full overflow-hidden border-b bg-background/60 p-4">
              <span className="absolute left-3 top-3 z-10 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {String(variation.id).padStart(2, "0")}
              </span>
              <TabStaff seed={variation.id * 9 + 3} measures={4} height={96} />
            </div>
            <div className="baseVertFlex !items-start gap-1 p-4">
              <p className="text-lg font-semibold transition-colors group-hover:text-primary">
                {variation.name}
              </p>
              <p className="text-sm text-foreground/65">{variation.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export default HomepageVariationsGallery;
