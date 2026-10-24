import Head from "next/head";
import { useRouter } from "next/router";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  getCanonicalUrl,
  OPEN_GRAPH_IMAGE,
  SITE_URL,
} from "~/utils/seo";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

export default function SEO({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  path,
  noIndex = false,
}: SEOProps) {
  const { asPath, pathname } = useRouter();
  const canonicalUrl = getCanonicalUrl(path ?? asPath);
  const imageUrl = new URL(OPEN_GRAPH_IMAGE.path, SITE_URL).toString();
  const preventIndexing =
    noIndex ||
    pathname.startsWith("/profile/") ||
    pathname.startsWith("/dev-") ||
    pathname === "/tab/[id]/edit" ||
    pathname === "/404" ||
    pathname === "/500";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} key="description" />
      <meta
        name="robots"
        content={
          preventIndexing
            ? "noindex, follow"
            : "index, follow, max-image-preview:large"
        }
        key="robots"
      />
      <link rel="canonical" href={canonicalUrl} key="canonical" />
      <meta property="og:title" content={title} key="og:title" />
      <meta
        property="og:description"
        content={description}
        key="og:description"
      />
      <meta property="og:url" content={canonicalUrl} key="og:url" />
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content="Autostrum" key="og:site_name" />
      <meta property="og:locale" content="en_US" key="og:locale" />
      <meta property="og:image" content={imageUrl} key="og:image" />
      <meta
        property="og:image:width"
        content={String(OPEN_GRAPH_IMAGE.width)}
        key="og:image:width"
      />
      <meta
        property="og:image:height"
        content={String(OPEN_GRAPH_IMAGE.height)}
        key="og:image:height"
      />
      <meta
        property="og:image:type"
        content={OPEN_GRAPH_IMAGE.type}
        key="og:image:type"
      />
      <meta
        property="og:image:alt"
        content={OPEN_GRAPH_IMAGE.alt}
        key="og:image:alt"
      />
      <meta
        name="twitter:card"
        content="summary_large_image"
        key="twitter:card"
      />
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta
        name="twitter:description"
        content={description}
        key="twitter:description"
      />
      <meta name="twitter:image" content={imageUrl} key="twitter:image" />
      <meta
        name="twitter:image:alt"
        content={OPEN_GRAPH_IMAGE.alt}
        key="twitter:image:alt"
      />
    </Head>
  );
}
