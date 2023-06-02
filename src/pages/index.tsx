import { type NextPage } from "next";
import { api } from "~/utils/api";
import Hero from "~/components/HomePage/Hero";
import Layout from "~/components/Layout/Layout";
import { motion } from "framer-motion";

const Home: NextPage = () => {
  return (
    <motion.div
      key={"home"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Hero />
    </motion.div>
  );
};

export default Home;
