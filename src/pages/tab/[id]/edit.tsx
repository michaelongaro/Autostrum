import { getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "../../../generated/client";
import { AnimatePresence, motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { BiErrorCircle } from "react-icons/bi";
import { BsArrowLeftShort } from "react-icons/bs";
import Tab from "~/components/Tab/Tab";
import superjson from "superjson";
import { Button } from "~/components/ui/button";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "~/env";
import { useHydrateTabStore } from "~/hooks/useHydrateTabStore";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}

interface PageData {
  userAllowedToEdit: boolean;
  tab: TabWithArtistMetadata | null;
  openGraphData: OpenGraphData;
}

function EditIndividualTab({ json }: { json: string }) {
  const { userAllowedToEdit, tab, openGraphData } = useMemo(
    () => superjson.parse<PageData>(json),
    [json],
  );

  const { query } = useRouter();

  useHydrateTabStore({
    fetchedTab: tab,
  });

  if (!tab) {
    return <TabNotFound />;
  }

  if (!userAllowedToEdit) {
    return (
      <UserNotAllowedToEdit
        tabId={
          tab ? (typeof query.id === "string" ? parseInt(query.id) : -1) : -1
        }
      />
    );
  }

  return (
    <motion.div
      key={"editingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 xl:w-[70%]"
    >
      <Head>
        <title>{openGraphData.title}</title>
        <meta name="description" content={openGraphData.description} />
        <meta property="og:title" content={openGraphData.title} />
        <meta property="og:url" content={openGraphData.url} />
        <meta property="og:description" content={openGraphData.description} />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <AnimatePresence mode="wait">
        <Tab />
      </AnimatePresence>
    </motion.div>
  );
}

export default EditIndividualTab;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);

  const tabId = ctx.params?.id ? parseInt(ctx.params.id as string) : -1;

  const prisma = new PrismaClient({ adapter });
  const tab = await prisma.tab.findUnique({
    where: {
      id: tabId,
    },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
    },
  });

  if (!tab) {
    return {
      props: {
        json: superjson.stringify({
          tab: null,
          openGraphData: {
            title: "Autostrum",
            url: "www.autostrum.com/tab/",
            description: "View and listen to this tab on Autostrum.",
          },
        }),
      },
    };
  }

  const openGraphData: OpenGraphData = {
    title: "Autostrum",
    url: `www.autostrum.com/tab/${ctx.params!.id as string}`,
    description: "View and listen to this tab on Autostrum.",
  };

  if (tab) {
    openGraphData.title = `Edit ${tab.title} | Autostrum`;
    openGraphData.description = `Edit ${tab.title} on Autostrum.`;
  }

  const tabWithArtistMetadata: TabWithArtistMetadata = {
    ...tab,
    artistId: tab.artist?.id || null,
    artistName: tab.artist?.name,
    artistIsVerified: tab.artist?.isVerified,
  };

  return {
    props: {
      json: superjson.stringify({
        userAllowedToEdit: tab?.createdByUserId === userId,
        tab: tabWithArtistMetadata,
        openGraphData,
      }),
    },
  };
};

function TabNotFound() {
  return (
    <div className="baseVertFlex w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[500px]">
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

function UserNotAllowedToEdit({ tabId }: { tabId: number }) {
  return (
    <div className="baseVertFlex w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[550px]">
      <div className="baseFlex gap-3 sm:gap-4">
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-xl font-bold sm:text-2xl">Access denied</h1>
        </div>
      </div>
      <span className="text-center text-base sm:text-lg">
        You must be logged in as the owner of the tab to edit it.
      </span>

      <Button asChild>
        <Link
          prefetch={false}
          href={`/tab/${tabId}`}
          className="baseFlex gap-1 pr-6"
        >
          <BsArrowLeftShort className="h-6 w-8" />
          Return to tab
        </Link>
      </Button>
    </div>
  );
}
