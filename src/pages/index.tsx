import { buildClerkProps, getAuth } from "@clerk/nextjs/server";
import { motion } from "framer-motion";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Hero from "~/components/HomePage/Hero";

function Home({
  showSignUpAndSignInButtons,
}: {
  showSignUpAndSignInButtons: boolean;
}) {
  return (
    <motion.div
      key={"home"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Head>
        <title>Autostrum</title>
        <meta
          name="description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Play along to any tab with our realistic generated audio or directly with the artist's recording."
        />
        <meta property="og:title" content="Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com" />
        <meta
          property="og:description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Play along to any tab with our realistic generated audio or directly with the artist's recording."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>
      <Hero showSignUpAndSignInButtons={showSignUpAndSignInButtons} />
    </motion.div>
  );
}

export default Home;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);

  return {
    props: {
      showSignUpAndSignInButtons: userId === null,
      ...buildClerkProps(ctx.req),
    },
  };
};
