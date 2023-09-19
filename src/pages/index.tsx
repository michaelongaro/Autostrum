import Hero from "~/components/HomePage/Hero";
import { motion } from "framer-motion";
import { getAuth, buildClerkProps } from "@clerk/nextjs/server";
import type { GetServerSideProps } from "next";

const Home = ({
  showSignUpAndSignInButtons,
}: {
  showSignUpAndSignInButtons: boolean;
}) => {
  return (
    <motion.div
      key={"home"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <Hero showSignUpAndSignInButtons={showSignUpAndSignInButtons} />
    </motion.div>
  );
};

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
