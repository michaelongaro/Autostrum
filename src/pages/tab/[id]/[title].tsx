import { PrismaClient } from "@prisma/client";
import { motion } from "framer-motion";
import type { GetStaticProps } from "next";
import Head from "next/head";
import { useEffect, useMemo } from "react";
import { BiErrorCircle } from "react-icons/bi";
import Tab from "~/components/Tab/Tab";
import { useTabStore } from "~/stores/TabStore";
import type { Tab as TabType } from "@prisma/client";
import superjson from "superjson";

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}

interface PageData {
  tab: TabType | null;
  openGraphData: OpenGraphData;
}

function ViewIndividualTab({ json }: { json: string }) {
  const { tab, openGraphData } = useMemo(
    () => superjson.parse<PageData>(json),
    [json],
  );

  const { setEditing } = useTabStore((state) => ({
    setEditing: state.setEditing,
  }));

  useEffect(() => {
    setEditing(false);
  }, []);

  return (
    <motion.div
      key={"viewingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{openGraphData.title}</title>
        <meta name="description" content={openGraphData.description} />
        <meta property="og:title" content={openGraphData.title}></meta>
        <meta property="og:url" content={openGraphData.url} />
        <meta property="og:description" content={openGraphData.description} />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/viewingTab.png"
        ></meta>
      </Head>

      {tab ? <Tab tab={tab} /> : <TabNotFound />}
    </motion.div>
  );
}

export default ViewIndividualTab;

export const getStaticProps: GetStaticProps = async (ctx) => {
  const prisma = new PrismaClient();

  const id = ctx.params?.id ? parseInt(ctx.params.id as string) : -1;

  const tab = await prisma.tab.findUnique({
    where: {
      id,
    },
  });

  if (!tab) {
    return {
      props: {
        tab: null,
        openGraphData: {
          title: "Autostrum",
          url: "www.autostrum.com/tab/",
          description: "View and listen to this tab on Autostrum.",
        },
      },
    };
  }

  let user = null;

  // get tab owner username
  if (tab?.createdByUserId) {
    user = await prisma.user.findUnique({
      where: {
        userId: tab.createdByUserId,
      },
      select: {
        username: true,
      },
    });
  }

  const openGraphData: OpenGraphData = {
    title: `${tab.title} | Autostrum`,
    url: `www.autostrum.com/tab/?title=${encodeURIComponent(tab.title)}&id=${tab.id}`,
    description: `View ${
      user?.username ? `${user.username}'s tab` : "the tab"
    } ${tab.title} on Autostrum.`,
  };

  return {
    props: {
      json: superjson.stringify({
        tab,
        openGraphData,
      }),
    },
  };
};

export async function getStaticPaths() {
  // Pre-render no paths at build time, generate all on demand

  return {
    paths: [],
    fallback: "blocking",
  };
}

function TabNotFound() {
  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[500px]">
      <div className="baseFlex gap-3 sm:gap-4">
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-xl font-bold sm:text-2xl">Tab not found</h1>
        </div>
      </div>
      <p className="text-center text-base sm:text-lg">
        The tab you are looking for does not exist. Please check the URL and try
        again.
      </p>
    </div>
  );
}
