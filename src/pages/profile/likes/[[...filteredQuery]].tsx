import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

import { UserProfile, useAuth } from "@clerk/nextjs";
import { Separator } from "~/components/ui/separator";
import Link from "next/link";
import formatDate from "~/utils/formatDate";
import TopProfileNavigationLayout from "~/components/Layouts/TopProfileNavigationLayout";
import { TabsContent } from "~/components/ui/tabs";

function ArtistLikes() {
  const { userId } = useAuth();
  const router = useRouter();
  const { push, asPath } = useRouter();

  // fair to have these here rather than store because (so far) we don't have to navigate around
  // "relative" classes on any parent elems in this component
  const [showPinnedTabModal, setShowPinnedTabModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: userId!,
    },
    {
      enabled: !!userId,
    }
  );

  return (
    <motion.div
      key={"ArtistLikes"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // remove z-50 if possible, I think <Bubbles /> is messing it up
      className="baseVertFlex z-50 w-full"
    >
      <TabsContent value="likes">
        <div>{artist?.username}</div>
        <div>hello</div>
      </TabsContent>
    </motion.div>
  );
}

ArtistLikes.PageLayout = TopProfileNavigationLayout;

export default ArtistLikes;
