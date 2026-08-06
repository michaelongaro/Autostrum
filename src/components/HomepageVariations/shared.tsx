import { type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { LOGO_PATHS_WITHOUT_TITLE } from "~/utils/logoPaths";

export const TOTAL_VARIATIONS = 10;

export const VARIATION_META: { id: number; name: string; blurb: string }[] = [
  { id: 1, name: "Editorial Split", blurb: "Bold left headline, oversized tab preview" },
  { id: 2, name: "Bento Grid", blurb: "Modular tiles for every entry point" },
  { id: 3, name: "Product Tour", blurb: "Alternating compose / discover / practice rows" },
  { id: 4, name: "Stats & Proof", blurb: "Counters, trending strip, social proof" },
  { id: 5, name: "Minimal Spotlight", blurb: "One search, one tab, pure focus" },
  { id: 6, name: "For You Dashboard", blurb: "App-like personalized landing" },
  { id: 7, name: "Genre First", blurb: "Colorful genre grid leads the way" },
  { id: 8, name: "Practice Mode", blurb: "Playback controls front and center" },
  { id: 9, name: "Creator Spotlight", blurb: "Community leaderboard and features" },
  { id: 10, name: "Magazine Cover", blurb: "Large-type tab-of-the-day editorial" },
];

export function VariationFrame({
  id,
  title,
  children,
}: {
  id: number;
  title: string;
  children: ReactNode;
}) {
  const prev = id === 1 ? TOTAL_VARIATIONS : id - 1;
  const next = id === TOTAL_VARIATIONS ? 1 : id + 1;

  return (
    <motion.div
      key={`variation-${id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="baseVertFlex w-full"
    >
      <Head>
        <title>{`Autostrum — Homepage ${id}: ${title}`}</title>
        <meta name="description" content={`Homepage design exploration ${id}: ${title}`} />
      </Head>

      {children}

      {/* Floating variation switcher */}
      <div className="baseFlex fixed bottom-4 left-1/2 z-50 -translate-x-1/2 gap-1 rounded-full border bg-background/90 p-1 shadow-lg backdrop-blur">
        <Link
          href={`/homepage-variations/${prev}`}
          aria-label="Previous variation"
          className="baseFlex size-8 rounded-full text-foreground/80 transition-colors hover:bg-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <Link
          href="/homepage-variations"
          className="baseFlex gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
        >
          <span className="font-bold text-foreground">{id}</span>
          <span className="hidden text-foreground/60 sm:inline">/ {TOTAL_VARIATIONS}</span>
          <span className="hidden max-w-[140px] truncate sm:inline">{title}</span>
        </Link>
        <Link
          href={`/homepage-variations/${next}`}
          aria-label="Next variation"
          className="baseFlex size-8 rounded-full text-foreground/80 transition-colors hover:bg-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Themed pick logo (mirrors HeaderLogo's data-color layering)               */
/* -------------------------------------------------------------------------- */

const LOGO_COLORS = [
  "peony",
  "coral",
  "saffron",
  "maple",
  "pistachio",
  "verdant",
  "aqua",
  "sapphire",
  "amethyst",
] as const;

export function PickLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`headerLogo${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    >
      {LOGO_COLORS.map((color) => (
        <img
          key={color}
          src={LOGO_PATHS_WITHOUT_TITLE[color] || "/placeholder.svg"}
          alt=""
          width={size}
          height={size}
          decoding="async"
          draggable={false}
          data-logo-color={color}
          className="headerLogoLayer"
          style={{ objectPosition: "center" }}
        />
      ))}
      <span className="sr-only">Autostrum pick logo</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Deterministic mock guitar-tab staff (SVG)                                 */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];

export function TabStaff({
  seed = 1,
  measures = 4,
  showLabels = false,
  className = "",
  height = 120,
}: {
  seed?: number;
  measures?: number;
  showLabels?: boolean;
  className?: string;
  height?: number;
}) {
  const rand = mulberry32(seed);
  const W = 600;
  const H = height;
  const padX = showLabels ? 34 : 14;
  const padY = 16;
  const strings = 6;
  const usableH = H - padY * 2;
  const rowGap = usableH / (strings - 1);
  const measureW = (W - padX - 14) / measures;

  const notes: { x: number; y: number; fret: string }[] = [];
  for (let m = 0; m < measures; m++) {
    const columns = 3 + Math.floor(rand() * 3);
    for (let c = 0; c < columns; c++) {
      const notesInColumn = rand() > 0.55 ? 2 : 1;
      const usedRows = new Set<number>();
      for (let n = 0; n < notesInColumn; n++) {
        let row = Math.floor(rand() * strings);
        while (usedRows.has(row)) row = Math.floor(rand() * strings);
        usedRows.add(row);
        const x =
          padX + m * measureW + (measureW / (columns + 1)) * (c + 1);
        const y = padY + row * rowGap;
        const fret = Math.floor(rand() * 13);
        notes.push({ x, y, fret: String(fret) });
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`text-foreground ${className}`}
      role="img"
      aria-label="Guitar tab preview"
    >
      {/* string lines */}
      {Array.from({ length: strings }).map((_, i) => {
        const y = padY + i * rowGap;
        return (
          <line
            key={`s-${i}`}
            x1={padX}
            y1={y}
            x2={W - 14}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={1}
          />
        );
      })}

      {/* bar lines */}
      {Array.from({ length: measures + 1 }).map((_, i) => {
        const x = padX + i * measureW;
        return (
          <line
            key={`b-${i}`}
            x1={x}
            y1={padY}
            x2={x}
            y2={padY + (strings - 1) * rowGap}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={1}
          />
        );
      })}

      {/* string labels */}
      {showLabels &&
        STRING_LABELS.map((label, i) => (
          <text
            key={`l-${i}`}
            x={padX - 12}
            y={padY + i * rowGap + 3.5}
            fill="currentColor"
            fillOpacity={0.55}
            fontSize={10}
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

      {/* fret numbers, with a knockout background so they sit on the line */}
      {notes.map((note, i) => (
        <g key={`n-${i}`}>
          <rect
            x={note.x - 5}
            y={note.y - 6}
            width={note.fret.length > 1 ? 14 : 10}
            height={12}
            fill="hsl(var(--background))"
          />
          <text
            x={note.x}
            y={note.y + 3.5}
            fill="currentColor"
            fillOpacity={0.85}
            fontSize={11}
            fontWeight={500}
            textAnchor="middle"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {note.fret}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Difficulty bars (signal-strength style, 5 bars)                           */
/* -------------------------------------------------------------------------- */

export function DifficultyBars({
  level,
  className = "",
}: {
  level: number;
  className?: string;
}) {
  return (
    <div className={`baseFlex gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-foreground transition-opacity"
          style={{
            height: 6 + i * 3,
            opacity: i < level ? 0.9 : 0.28,
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Genre metadata                                                            */
/* -------------------------------------------------------------------------- */

export interface Genre {
  name: string;
  count: number;
  color: string; // hsl string
  thumbnail: string;
}

export const GENRES: Genre[] = [
  { name: "Rock", count: 24, color: "0 72% 46%", thumbnail: "/genreThumbnails/rock.webp" },
  { name: "Indie", count: 31, color: "20 88% 48%", thumbnail: "/genreThumbnails/indie.webp" },
  { name: "Jazz", count: 2, color: "40 88% 48%", thumbnail: "/genreThumbnails/jazz.webp" },
  { name: "Pop", count: 10, color: "96 55% 44%", thumbnail: "/genreThumbnails/pop.webp" },
  { name: "Folk", count: 4, color: "190 68% 40%", thumbnail: "/genreThumbnails/folk.webp" },
  { name: "Country", count: 1, color: "168 58% 38%", thumbnail: "/genreThumbnails/country.webp" },
  { name: "Blues", count: 0, color: "220 78% 52%", thumbnail: "/genreThumbnails/blues.webp" },
  { name: "Hip-Hop", count: 0, color: "275 78% 56%", thumbnail: "/genreThumbnails/hiphop.webp" },
  { name: "Electronic", count: 0, color: "322 82% 50%", thumbnail: "/genreThumbnails/electronic.webp" },
  { name: "Classical", count: 2, color: "25 62% 46%", thumbnail: "/genreThumbnails/classical.webp" },
  { name: "Metal", count: 1, color: "220 8% 46%", thumbnail: "/genreThumbnails/metal.webp" },
  { name: "Misc.", count: 17, color: "200 78% 50%", thumbnail: "/genreThumbnails/misc.webp" },
];

export const GENRE_BY_NAME = Object.fromEntries(
  GENRES.map((g) => [g.name, g]),
) as Record<string, Genre>;

export function GenreBadge({ name }: { name: string }) {
  const genre = GENRE_BY_NAME[name];
  const color = genre?.color ?? "200 78% 50%";
  return (
    <span
      className="baseFlex w-fit gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: `hsl(${color})` }}
    >
      {name}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sample tab data                                                           */
/* -------------------------------------------------------------------------- */

export interface SampleTab {
  id: number;
  title: string;
  artist: string;
  genre: string;
  difficulty: number;
  date: string;
  seed: number;
  rating?: number;
  ratingCount?: number;
  views?: string;
}

export const SAMPLE_TABS: SampleTab[] = [
  { id: 1, title: "Everlong", artist: "Foo Fighters", genre: "Rock", difficulty: 4, date: "10/25/2023", seed: 7, rating: 4.8, ratingCount: 12, views: "3.2K" },
  { id: 2, title: "The Avatar's Love", artist: "Avatar the Last Airbender", genre: "Misc.", difficulty: 2, date: "10/3/2023", seed: 12, rating: 5.0, ratingCount: 1, views: "1.5K" },
  { id: 3, title: "Mad World", artist: "Gary Jules", genre: "Indie", difficulty: 2, date: "7/11/2026", seed: 21, rating: 4.6, ratingCount: 8, views: "980" },
  { id: 4, title: "Clairvoyant", artist: "The Story So Far", genre: "Rock", difficulty: 3, date: "6/27/2025", seed: 33, rating: 4.4, ratingCount: 5, views: "760" },
  { id: 5, title: "Wake Me Up When September Ends", artist: "Green Day", genre: "Rock", difficulty: 3, date: "5/2/2025", seed: 41, rating: 4.7, ratingCount: 19, views: "5.1K" },
  { id: 6, title: "We Are Banana Blu", artist: "Heartsii", genre: "Misc.", difficulty: 1, date: "8/1/2026", seed: 52, rating: 4.1, ratingCount: 3, views: "420" },
  { id: 7, title: "G/Am/G/Dm Guitar Progression", artist: "Darien-Isaac", genre: "Pop", difficulty: 2, date: "7/31/2026", seed: 63, rating: 4.9, ratingCount: 7, views: "1.1K" },
  { id: 8, title: "Election Day (WIP)", artist: "Blaze Foley", genre: "Country", difficulty: 3, date: "7/28/2026", seed: 74, rating: 4.2, ratingCount: 2, views: "310" },
];

export interface FeaturedUser {
  username: string;
  totalTabs: number;
  totalViews: string;
  averageRating: number;
  bookmarks: number;
}

export const FEATURED_USERS: FeaturedUser[] = [
  { username: "leyendo", totalTabs: 57, totalViews: "1.5K", averageRating: 4.1, bookmarks: 10 },
  { username: "shadow", totalTabs: 34, totalViews: "890", averageRating: 4.4, bookmarks: 6 },
  { username: "riffmaster", totalTabs: 128, totalViews: "12.4K", averageRating: 4.7, bookmarks: 44 },
  { username: "fretwork", totalTabs: 21, totalViews: "530", averageRating: 3.9, bookmarks: 3 },
];

export const SITE_STATS = [
  { label: "Tabs published", value: "1,240" },
  { label: "Active creators", value: "310" },
  { label: "Play-alongs", value: "48K" },
  { label: "Genres", value: "12" },
];

/* -------------------------------------------------------------------------- */
/*  Reusable mini tab card (matches the app's grid card language)             */
/* -------------------------------------------------------------------------- */

export function MiniTabCard({
  tab,
  className = "",
  style,
}: {
  tab: SampleTab;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`group overflow-hidden rounded-xl border bg-secondary/40 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
      style={style}
    >
      <div className="relative h-[132px] w-full overflow-hidden border-b bg-background/60 p-3">
        <span className="absolute left-3 top-3 z-10 rounded-md border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
          Intro
        </span>
        <button
          type="button"
          aria-label="Bookmark tab"
          className="absolute right-3 top-3 z-10 rounded-md border bg-background/80 p-1.5 text-foreground/70"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
          </svg>
        </button>
        <div className="mt-6 h-[90px] w-full">
          <TabStaff seed={tab.seed} measures={4} height={90} />
        </div>
      </div>

      <div className="baseVertFlex items-start gap-2 p-3">
        <p className="line-clamp-1 text-base font-semibold text-foreground">
          {tab.title}
        </p>
        <div className="baseFlex w-full !justify-between gap-2">
          <span className="line-clamp-1 text-sm text-foreground/70">
            {tab.artist}
          </span>
          <div className="baseFlex shrink-0 gap-1.5">
            <span className="text-xs text-foreground/60">Difficulty</span>
            <DifficultyBars level={tab.difficulty} />
          </div>
        </div>
        <div className="baseFlex w-full !justify-between gap-2 pt-0.5">
          <GenreBadge name={tab.genre} />
          <span className="text-xs text-foreground/55">{tab.date}</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small helpers used across variations                                      */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  icon,
  children,
  action,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="baseFlex w-full !justify-between gap-4">
      <h2 className="baseFlex gap-2 text-xl font-bold text-foreground">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function StarRating({
  rating,
  count,
}: {
  rating?: number;
  count?: number;
}) {
  if (!rating) return null;
  return (
    <span className="baseFlex gap-1 text-sm text-foreground/80">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2l1.4-6.8L2.2 9.7l6.9-.7z" />
      </svg>
      {rating.toFixed(1)}
      {count ? <span className="text-foreground/50">({count})</span> : null}
    </span>
  );
}
