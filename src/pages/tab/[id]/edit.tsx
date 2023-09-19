import { useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import Tab from "~/components/Tab/Tab";
import { motion } from "framer-motion";
import TabSkeleton from "~/components/Tab/TabSkeleton";
import { BsArrowRightShort } from "react-icons/bs";
import { BiErrorCircle } from "react-icons/bi";
import { getAuth, buildClerkProps } from "@clerk/nextjs/server";
import type { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import { Button } from "~/components/ui/button";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabEdit({
  userAllowedToEdit,
  tabExists,
}: {
  userAllowedToEdit: boolean;
  tabExists: boolean;
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
      {/* TODO: should ONLY render tab if the person viewing it is the owner of the tab, otherwise 
          display text saying `Sorry, only ${tabOwnerUsername} can edit this tab` */}

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
    include: {
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  return {
    props: {
      userAllowedToEdit: tab?.createdById === userId,
      tabExists: tab !== null,
      ...buildClerkProps(ctx.req),
    },
  };
};

function TabNotFound() {
  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[500px]">
      <div className="baseFlex gap-2">
        <BiErrorCircle className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Tab not found</h1>
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
  console.log(tabId);

  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[550px]">
      <div className="baseFlex gap-2">
        <BiErrorCircle className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Access denied</h1>
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
