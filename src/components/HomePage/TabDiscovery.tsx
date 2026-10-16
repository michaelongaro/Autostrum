import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { IoFlash, IoStatsChart } from "react-icons/io5";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { Button } from "~/components/ui/button";
import Verified from "~/components/ui/icons/Verified";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";

const TAB_LIMIT = 10;
const SKELETON_ROWS = Array.from({ length: TAB_LIMIT }, (_, index) => index);
const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
const TAB_LISTS = [
  { key: "mostRecentTabs", label: "Recently added", icon: IoFlash },
  { key: "mostPopularTabs", label: "Most popular", icon: IoStatsChart },
] as const;

type TabListKey = (typeof TAB_LISTS)[number]["key"];

function DiscoveryTabRow({ tab }: { tab: MinimalTabRepresentation }) {
  const artistName = tab.artist?.name ?? tab.createdBy?.username ?? "Anonymous";
  const artistHref = tab.artist
    ? `/artist/${encodeURIComponent(tab.artist.name)}/${tab.artist.id}/filters`
    : tab.createdBy
      ? `/user/${tab.createdBy.username}/filters`
      : null;

  return (
    <TableRow className="h-14">
      <TableCell className="pl-4 pr-2">
        <Link
          prefetch={false}
          href={`/tab/${tab.id}/${encodeURIComponent(tab.title)}`}
          title={tab.title}
          className="block truncate rounded-sm text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70 md:text-lg"
        >
          {tab.title}
        </Link>
      </TableCell>
      <TableCell className="px-2">
        {artistHref ? (
          <Link
            prefetch={false}
            href={artistHref}
            title={artistName}
            className="flex min-w-0 items-center gap-1 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70"
          >
            {tab.artist?.isVerified && (
              <Verified
                aria-label="Verified artist"
                className="size-4 shrink-0"
              />
            )}
            <span className="truncate">{artistName}</span>
          </Link>
        ) : (
          <span className="block truncate italic">{artistName}</span>
        )}
      </TableCell>
      <TableCell className="pl-2 pr-4">
        <div
          className="flex justify-end"
          title={DIFFICULTIES[tab.difficulty - 1]}
        >
          <span className="sr-only">
            Difficulty: {DIFFICULTIES[tab.difficulty - 1] ?? tab.difficulty}
          </span>
          <div aria-hidden="true">
            <DifficultyBars difficulty={tab.difficulty} />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DiscoveryTable({
  label,
  tabs,
  isLoading,
  isError,
  onRetry,
}: {
  label: string;
  tabs: MinimalTabRepresentation[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-md">
      <Table
        aria-label={`${label} tabs`}
        aria-busy={isLoading}
        className="table-fixed"
      >
        <colgroup>
          <col className="w-[55%]" />
          <col />
          <col className="w-12 md:w-14" />
        </colgroup>
        <TableBody>
          {isLoading ? (
            SKELETON_ROWS.map((index) => (
              <TableRow
                key={index}
                className="h-14 motion-safe:animate-pulse"
                aria-hidden="true"
              >
                <TableCell className="pl-4 pr-2">
                  <div className="h-4 w-3/4 rounded bg-foreground/10" />
                </TableCell>
                <TableCell className="px-2">
                  <div className="h-3 w-2/3 rounded bg-foreground/10" />
                </TableCell>
                <TableCell className="pl-2 pr-4">
                  <div className="ml-auto h-3 w-5 rounded bg-foreground/10" />
                </TableCell>
              </TableRow>
            ))
          ) : isError && !tabs ? (
            <TableRow>
              <TableCell colSpan={3} className="h-56 text-center">
                <p role="status" className="text-sm text-foreground/75">
                  Tabs couldn’t be loaded.
                </p>
                <Button variant="link" onClick={onRetry} className="mt-2">
                  Try again
                </Button>
              </TableCell>
            </TableRow>
          ) : tabs?.length ? (
            tabs
              .slice(0, TAB_LIMIT)
              .map((tab) => <DiscoveryTabRow key={tab.id} tab={tab} />)
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-56 text-center text-foreground/75"
              >
                No tabs yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {isLoading && (
        <span role="status" className="sr-only">
          Loading {label.toLowerCase()} tabs
        </span>
      )}
    </div>
  );
}

function TabDiscovery() {
  const [activeList, setActiveList] = useState<TabListKey>("mostRecentTabs");
  const reduceMotion = useReducedMotion();
  const { data, isLoading, isError, refetch } =
    api.search.getMostRecentAndPopularTabs.useQuery();

  return (
    <section
      aria-label="Discover tabs"
      className="w-full max-w-[1200px] px-4 md:px-6 lg:px-8"
    >
      <div
        role="group"
        aria-label="Choose tabs to discover"
        className="relative mb-4 grid grid-cols-2 rounded-xl border bg-background p-1 shadow-sm md:hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1"
        >
          <motion.div
            initial={false}
            animate={{ x: activeList === "mostRecentTabs" ? "0%" : "100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 35 }
            }
            className="h-full w-1/2 rounded-lg bg-secondary-active shadow-sm"
          />
        </div>
        {TAB_LISTS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant="text"
            aria-pressed={activeList === key}
            aria-controls={`homepage-${key}`}
            onClick={() => setActiveList(key)}
            className={cn(
              "relative h-11 gap-1.5 whitespace-nowrap px-1.5 text-xs font-semibold [@media(min-width:375px)]:text-sm",
              activeList !== key && "text-foreground/65",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {TAB_LISTS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            id={`homepage-${key}`}
            className={cn("min-w-0 md:block", activeList !== key && "hidden")}
          >
            <h2 className="mb-4 hidden items-center gap-2 text-xl font-bold md:flex">
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </h2>
            <DiscoveryTable
              label={label}
              tabs={data?.[key]}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => {
                void refetch();
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default TabDiscovery;
