import Head from "next/head";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect } from "react";
import VariationNav from "./VariationNav";
import type { VariationMeta } from "../content";
import { useTabStore } from "~/stores/TabStore";

type VariationShellProps = {
  meta: VariationMeta;
  children: ReactNode;
};

function VariationShell({ meta, children }: VariationShellProps) {
  const { theme, setTheme } = useTabStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

  useEffect(() => {
    if (!meta.forceDark) return;

    const previous = theme;
    if (previous !== "dark") {
      setTheme("dark");
    }

    return () => {
      if (previous !== "dark") {
        setTheme(previous);
      }
    };
    // Intentionally only when forceDark variation mounts/unmounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.forceDark, meta.slug]);

  return (
    <motion.div
      key={meta.slug}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className={`baseVertFlex w-full !justify-start ${
        meta.forceDark ? "hp-dark-session" : ""
      }`}
    >
      <Head>
        <title>{`${meta.title} · Homepage redesign | Autostrum`}</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content={meta.summary} />
      </Head>

      <VariationNav current={meta} />

      <div className="baseVertFlex w-full gap-16 pb-20 pt-6 md:gap-24 md:pb-28 md:pt-10">
        {children}
      </div>
    </motion.div>
  );
}

export default VariationShell;
