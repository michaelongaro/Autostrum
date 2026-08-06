import type { GetStaticPaths, GetStaticProps } from "next";
import { VARIATIONS, getVariation } from "~/components/HomePage/redesign/content";
import { VARIATION_COMPONENTS } from "~/components/HomePage/redesign/registry";

type PageProps = {
  slug: string;
};

function HomepageRedesignVariationPage({ slug }: PageProps) {
  const Variation = VARIATION_COMPONENTS[slug];

  if (!Variation) {
    return null;
  }

  return <Variation />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: VARIATIONS.map((variation) => ({
      params: { slug: variation.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const slug = context.params?.slug;

  if (typeof slug !== "string" || !getVariation(slug)) {
    return { notFound: true };
  }

  return {
    props: { slug },
  };
};

export default HomepageRedesignVariationPage;
