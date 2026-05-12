import type { GetServerSideProps } from "next";

const SITE_URL = "https://www.autostrum.com";
const MAX_URLS_PER_SITEMAP = 50000;

function SitemapXml() {
  // getServerSideProps writes the XML response directly — this component never renders
  return null;
}

export default SitemapXml;

function escapeXml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return str.replace(/[&<>"']/g, (match) => map[match]!);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

interface StaticPage {
  path: string;
  priority: string;
  changefreq: string;
}

const staticPages: StaticPage[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/explore", priority: "0.9", changefreq: "daily" },
  { path: "/create", priority: "0.8", changefreq: "monthly" },
  { path: "/tuner", priority: "0.7", changefreq: "monthly" },
  { path: "/tools", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/metronome", priority: "0.7", changefreq: "monthly" },
  { path: "/tools/warmups", priority: "0.6", changefreq: "monthly" },
  { path: "/tools/scales", priority: "0.6", changefreq: "monthly" },
  { path: "/tools/note-trainer", priority: "0.6", changefreq: "monthly" },
];

function buildUrlEntry(
  loc: string,
  lastmod: string,
  priority: string,
  changefreq: string,
): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const { prisma } = await import("~/server/db");

  try {
    const [tabs, artists] = await Promise.all([
      prisma.tab.findMany({
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.artist.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { id: "asc" },
      }),
    ]);

    const today = formatDate(new Date());

    // Build static page entries
    const staticEntries = staticPages.map((page) =>
      buildUrlEntry(
        `${SITE_URL}${page.path}`,
        today,
        page.priority,
        page.changefreq,
      ),
    );

    // Build tab entries
    const tabEntries = tabs.map((tab) =>
      buildUrlEntry(
        `${SITE_URL}/tab/${tab.id}/${encodeURIComponent(tab.title)}`,
        formatDate(tab.updatedAt),
        "0.6",
        "weekly",
      ),
    );

    // Build artist entries
    const artistEntries = artists
      .filter((artist) => artist.name)
      .map((artist) =>
        buildUrlEntry(
          `${SITE_URL}/artist/${encodeURIComponent(artist.name)}`,
          today,
          "0.7",
          "weekly",
        ),
      );

    const allEntries = [...staticEntries, ...tabEntries, ...artistEntries];

    if (allEntries.length > MAX_URLS_PER_SITEMAP) {
      // If the site grows beyond 50,000 URLs, serve a sitemap index instead.
      // For now, log a warning — split into paginated sub-sitemaps when needed.
      console.warn(
        `Sitemap has ${allEntries.length} URLs, exceeding the ${MAX_URLS_PER_SITEMAP} limit. Consider splitting into a sitemap index.`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=600",
    );
    res.write(xml);
    res.end();
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end();
    }
  } finally {
    await prisma.$disconnect();
  }

  return { props: {} };
};
