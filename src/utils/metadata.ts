import type { Metadata } from "next";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  getCanonicalUrl,
  OPEN_GRAPH_IMAGE,
  SITE_URL,
} from "./seo";

export function createMetadata({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  path,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const url = path === undefined ? undefined : getCanonicalUrl(path);
  const image = { ...OPEN_GRAPH_IMAGE, url: OPEN_GRAPH_IMAGE.path };
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Autostrum",
      locale: "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
