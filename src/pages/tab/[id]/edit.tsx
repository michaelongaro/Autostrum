import { getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { BiErrorCircle } from "react-icons/bi";
import { BsArrowLeftShort } from "react-icons/bs";
import AudioControls from "~/components/AudioControls/AudioControls";
import Tab from "~/components/Tab/Tab";
import { Button } from "~/components/ui/button";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { useTabStore } from "~/stores/TabStore";

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}

function EditIndividualTab({
  userAllowedToEdit,
  tab,
  openGraphData,
}: {
  userAllowedToEdit: boolean;
  tab: TabWithArtistMetadata;
  openGraphData: OpenGraphData;
}) {
  const { query } = useRouter();

  const { showingAudioControls } = useTabStore((state) => ({
    showingAudioControls: state.showingAudioControls,
  }));

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
      className="baseVertFlex w-full"
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
          content="https://www.autostrum.com/opengraphScreenshots/editingTab.png"
        ></meta>
      </Head>

      <AnimatePresence mode="wait">
        <Tab tab={tab} />
      </AnimatePresence>

      {/* can probably drop the <AnimatePresence> since it can't ever be triggered, right?*/}
      <AnimatePresence mode="wait">
        {showingAudioControls && <AudioControls />}
      </AnimatePresence>
    </motion.div>
  );
}

export default EditIndividualTab;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);

  const tabId = ctx.params?.id ? parseInt(ctx.params.id as string) : -1;

  const prisma = new PrismaClient();
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
      createdBy: {
        select: {
          username: true,
        },
      },
    },
  });

  const openGraphData: OpenGraphData = {
    title: "Autostrum",
    url: `www.autostrum.com/tab/${ctx.params!.id as string}`,
    description: "View and listen to this tab on Autostrum.",
  };

  if (tab) {
    openGraphData.title = `Edit ${tab.title} | Autostrum`;
    openGraphData.description = `Edit ${
      tab.createdBy?.username ? `${tab.createdBy.username}'s tab` : "this tab"
    } ${tab.title} on Autostrum.`;
  }

  // removing user from tab object to adhere to TabWithArtistMetadata type
  const { createdBy, ...tabWithArtistMetadata } = tab || {};

  return {
    props: {
      userAllowedToEdit: tab?.createdByUserId === userId,
      tab: tabWithArtistMetadata,
      openGraphData,
    },
  };
};

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

function UserNotAllowedToEdit({ tabId }: { tabId: number }) {
  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[550px]">
      <div className="baseFlex gap-3 sm:gap-4">
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-xl font-bold sm:text-2xl">Access denied</h1>
        </div>
      </div>
      <p className="text-center text-base sm:text-lg">
        You must be logged in as the owner of the tab to edit it.
      </p>

      <Button asChild>
        <Link href={`/tab/${tabId}`} className="baseFlex gap-1 pr-6">
          <BsArrowLeftShort className="h-6 w-8 text-pink-100" />
          Return to tab
        </Link>
      </Button>
    </div>
  );
}
