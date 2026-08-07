import { motion } from "framer-motion";
import Head from "next/head";
import CustomizeLook from "~/components/HomePage/CustomizeLook";
import Hero from "~/components/HomePage/Hero";
import PillarCards from "~/components/HomePage/PillarCards";
import SignupCTA from "~/components/HomePage/SignupCTA";
import TabMarquee from "~/components/HomePage/TabMarquee";
import ToolsShowcase from "~/components/HomePage/ToolsShowcase";

function Home() {
  return (
    <motion.div
      key={"home"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full gap-16 py-16 md:gap-24 md:py-24"
    >
      <Head>
        <title>Autostrum</title>
        <meta
          name="description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:title" content="Autostrum"></meta>
        <meta property="og:url" content="https://www.autostrum.com" />
        <meta
          property="og:description"
          content="Create and share your riffs exactly how you want them to sound. Our advanced tab editor minimizes repetitive actions so you can focus on creating your music. Practice any tab alongside our realistic generated audio and convenient audio controls."
        />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
      </Head>

      <Hero />
      <PillarCards />
      <TabMarquee />
      <SignupCTA />
      <ToolsShowcase />
      <CustomizeLook />
    </motion.div>
  );
}

export default Home;
