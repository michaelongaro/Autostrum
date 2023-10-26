import { buildClerkProps, getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { BiErrorCircle } from "react-icons/bi";
import { BsArrowRightShort } from "react-icons/bs";
import NoResultsFoundBubbles from "~/components/Search/NoResultsFoundBubbles";
import Tab from "~/components/Tab/Tab";
import TabSkeleton from "~/components/Tab/TabSkeleton";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}
// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabEdit({
  userAllowedToEdit,
  tabExists,
  openGraphData,
}: {
  userAllowedToEdit: boolean;
  tabExists: boolean;
  openGraphData: OpenGraphData;
}) {
  const router = useRouter();

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  const fetchedTab = api.tab.getTabById.useQuery({
    id: tabIdFromUrl,
  });

  if (!userAllowedToEdit) {
    return <UserNotAllowedToEdit tabId={tabExists ? tabIdFromUrl : -1} />;
  }

  if (!tabExists) {
    return <TabNotFound />;
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

      {fetchedTab ? (
        <Tab tab={fetchedTab.data} />
      ) : (
        <TabSkeleton editing={true} />
      )}
    </motion.div>
  );
}

export default IndividualTabEdit;

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
    artist = await prisma.artist.findUnique({
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
      <div className="baseFlex gap-4">
        <NoResultsFoundBubbles color={"#ec4899"} />
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Tab not found</h1>
        </div>
        <NoResultsFoundBubbles color={"#ec4899"} reverseBubblePositions />
      </div>
      <p className="text-center text-lg">
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
      <div className="baseFlex gap-4">
        <NoResultsFoundBubbles color={"#ec4899"} />
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Access denied</h1>
        </div>
        <NoResultsFoundBubbles color={"#ec4899"} reverseBubblePositions />
      </div>
      <p className="text-center text-lg">
        You must be logged in as the owner of the tab to edit it.
      </p>
      {tabId !== -1 && (
        <Button
          onClick={() => void push(`/tab/${tabId}`)}
          className="baseFlex gap-1 pr-6"
        >
          <BsArrowRightShort className="h-6 w-8 rotate-180 text-pink-50" />
          Return to tab
        </Button>
      )}
    </div>
  );
}
