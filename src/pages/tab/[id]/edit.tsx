import { buildClerkProps, getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { BiErrorCircle } from "react-icons/bi";
import { BsArrowLeftShort } from "react-icons/bs";
import Tab from "~/components/Tab/Tab";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import { AnimatePresence } from "framer-motion";
import AudioControls from "~/components/AudioControls/AudioControls";
import { useTabStore } from "~/stores/TabStore";

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}

function EditIndividualTab({
  userAllowedToEdit,
  tabExists,
  openGraphData,
}: {
  userAllowedToEdit: boolean;
  tabExists: boolean;
  openGraphData: OpenGraphData;
}) {
  const router = useRouter();

  const { showingAudioControls } = useTabStore((state) => ({
    showingAudioControls: state.showingAudioControls,
  }));

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  const fetchedTab = api.tab.getTabById.useQuery({
    id: tabIdFromUrl,
  });

  if (!tabExists) {
    return <TabNotFound />;
  }

  if (!userAllowedToEdit) {
    return <UserNotAllowedToEdit tabId={tabExists ? tabIdFromUrl : -1} />;
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
        {fetchedTab && <Tab tab={fetchedTab.data} />}
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

  const prisma = new PrismaClient();
  const tab = await prisma.tab.findUnique({
    where: {
      id: ctx.params?.id ? parseInt(ctx.params.id as string) : -1,
    },
    select: {
      title: true,
      createdById: true,
    },
  });

  let artist = null;

  // get tab owner username
  if (tab?.createdById) {
    artist = await prisma.user.findUnique({
      where: {
        userId: tab.createdById,
      },
      select: {
        username: true,
      },
    });
  }

  const openGraphData: OpenGraphData = {
    title: "Autostrum",
    url: `www.autostrum.com/tab/${ctx.params!.id as string}`,
    description: "View and listen to this tab on Autostrum.",
  };

  if (tab) {
    openGraphData.title = `Edit ${tab.title} | Autostrum`;
    openGraphData.description = `Edit ${
      artist?.username ? `${artist.username}'s tab` : "the tab"
    } ${tab.title} on Autostrum.`;
  }
  return {
    props: {
      userAllowedToEdit: tab?.createdById === userId,
      tabExists: tab !== null,
      openGraphData,
      ...buildClerkProps(ctx.req),
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
  const { push } = useRouter();

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

      <Button
        onClick={() => void push(`/tab/${tabId}`)}
        className="baseFlex gap-1 pr-6"
      >
        <BsArrowLeftShort className="h-6 w-8 text-pink-100" />
        Return to tab
      </Button>
    </div>
  );
}
