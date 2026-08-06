import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { VARIATIONS } from "~/components/HomePage/redesign/content";
import BrandMark from "~/components/HomePage/redesign/shared/BrandMark";
import "~/components/HomePage/redesign/redesign.css";

function HomepageRedesignGallery() {
  return (
    <motion.div
      key="homepage-redesign-gallery"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="baseVertFlex w-full gap-10 px-4 py-12 md:gap-12 md:py-16"
    >
      <Head>
        <title>Homepage redesign gallery | Autostrum</title>
        <meta name="robots" content="noindex" />
        <meta
          name="description"
          content="Ten Autostrum homepage redesign variations — maple-forward, musician-first product landings."
        />
      </Head>

      <div className="baseVertFlex max-w-2xl gap-4 text-center">
        <BrandMark size="section" />
        <h1 className="text-2xl font-bold md:text-4xl">
          Homepage redesign gallery
        </h1>
        <p className="text-sm text-foreground/80 md:text-base">
          Ten compositionally distinct landings that keep the same brand,
          maple palette, Noto Sans, and feature story. Pick a direction — each
          includes desktop and mobile-responsive layouts.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to current homepage
        </Link>
      </div>

      <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-2">
        {VARIATIONS.map((variation) => (
          <Link
            key={variation.slug}
            href={`/homepage-redesign/${variation.slug}`}
            className="hp-card-hover rounded-xl border bg-background/90 p-5 text-left shadow-sm"
          >
            <div className="baseFlex !justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {String(variation.number).padStart(2, "0")}
              </span>
              <span className="rounded-md border px-2 py-0.5 text-xs text-foreground/65">
                {variation.emphasis}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold">{variation.title}</h2>
            <p className="mt-2 text-sm text-foreground/75">{variation.summary}</p>
            {variation.forceDark && (
              <p className="mt-3 text-xs text-foreground/55">
                Opens in dark maple theme
              </p>
            )}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export default HomepageRedesignGallery;
