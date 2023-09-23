import { buildClerkProps } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { BiErrorCircle } from "react-icons/bi";
import { shallow } from "zustand/shallow";
import Tab from "~/components/Tab/Tab";
import TabSkeleton from "~/components/Tab/TabSkeleton";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";

// not sure if this is correct file routing for slug

// not sure if this is the best name for this component
function IndividualTabView({ tabExists }: { tabExists: boolean }) {
  const router = useRouter();

  const { setEditing } = useTabStore(
    (state) => ({
      setEditing: state.setEditing,
    }),
    shallow
  );

  useEffect(() => {
    setEditing(false); // zustand setters should be referential so it won't ever be stale
  }, []);

  const tabIdFromUrl = useMemo(() => {
    if (typeof router.query.id === "string") {
      return parseInt(router.query.id);
    }
    return -1;
  }, [router.query.id]);

  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
    {
      id: tabIdFromUrl,
    },
    {
      enabled: tabIdFromUrl !== -1,
    }
  );

  if (!tabExists) {
    return <TabNotFound />;
  }

  return (
    <motion.div
      key={"viewingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <>
        {fetchedTab ? (
          <Tab tab={fetchedTab} refetchTab={refetchTab} />
        ) : (
          <TabSkeleton editing={false} />
        )}
      </>
    </motion.div>
  );
}

export default IndividualTabView;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
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

  return { props: { tabExists: tab !== null, ...buildClerkProps(ctx.req) } };
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
