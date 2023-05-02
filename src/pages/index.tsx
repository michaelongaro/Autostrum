import { type NextPage } from "next";
import { api } from "~/utils/api";
import Hero from "~/components/HomePage/Hero";
import Layout from "~/components/Layout/Layout";

const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <Layout>
      <Hero />
    </Layout>
  );
};

export default Home;
