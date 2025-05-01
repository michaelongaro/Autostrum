import type { Tab } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { tuningNotes } from "~/utils/tunings";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

interface TabWithArtistRank {
  id: number;
  title: string;
  genreId: number;
  artistId: number | null; // Nullable because of LEFT JOIN and optional relation
  artistName: string | null; // Nullable because of LEFT JOIN and optional relation
  artistIsVerified: boolean | null; // Nullable
  rank: number;
}

export interface InfiniteQueryParams {
  searchQuery: string | undefined;
  genreId: number | undefined;
  tuning: string | undefined;
  capo: boolean | undefined;
  difficulty: number | undefined;
  sortBy: "relevance" | "newest" | "oldest" | "mostPopular" | "leastPopular";
  userIdToSelectFrom: string | undefined;
  artistIdToSelectFrom: number | undefined;
  bookmarkedByUserId: string | undefined;
}

export interface MinimalTabRepresentation {
  id: number;
  title: string;
  genreId: number;
  createdAt: Date;
  difficulty: number;
  averageRating: number;
  ratingsCount: number;
  artist: {
    id: number;
    name: string;
    isVerified: boolean;
  } | null;
  createdBy: {
    userId: string;
    username: string;
  } | null;
}
export interface FullTab extends Tab {
  artistName?: string;
}

export const searchRouter = createTRPCRouter({
  getMinimalTabById: publicProcedure
    .input(z.number())
    .query(async ({ input: tabId, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: tabId,
        },
        select: {
          id: true,
          title: true,
          genreId: true,
          createdAt: true,
          difficulty: true,
          averageRating: true,
          ratingsCount: true,
          artist: {
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
          },
          createdBy: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (!tab) return null;

      const conditionalArtist = tab.artist
        ? {
            id: tab.artist.id,
            name: tab.artist.name,
            isVerified: tab.artist.isVerified,
          }
        : null;

      const conditionalCreatedBy = tab.createdBy
        ? {
            userId: tab.createdBy.userId,
            username: tab.createdBy.username,
          }
        : null;

      const fullTab: MinimalTabRepresentation = {
        ...tab,
        artist: conditionalArtist,
        createdBy: conditionalCreatedBy,
      };
      return fullTab;
    }),

  getMostPopularDailyTabsAndArtists: publicProcedure.query(async ({ ctx }) => {
    // tab/artist ids are updated daily by a cron job,
    // this just fetches the necessary fields from each id

    const dailyMostPopularTabs = await ctx.prisma.mostPopularTabs.findMany({
      select: {
        tab: {
          select: {
            id: true,
            title: true,
            genreId: true,
            artist: {
              select: {
                id: true,
                name: true,
                isVerified: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: 5,
    });

    const dailyMostPopularArtists =
      await ctx.prisma.mostPopularArtists.findMany({
        select: {
          artist: {
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
        take: 5,
      });

    const sanitizedTabs = dailyMostPopularTabs.map((tab) => {
      return {
        id: tab.tab.id,
        title: tab.tab.title,
        genreId: tab.tab.genreId,
        artist: {
          id: tab.tab.artist?.id ?? null,
          name: tab.tab.artist?.name ?? null,
          isVerified: tab.tab.artist?.isVerified ?? false,
        },
      };
    });

    const sanitizedArtists = dailyMostPopularArtists.map((artist) => {
      return {
        id: artist.artist.id,
        name: artist.artist.name,
        isVerified: artist.artist.isVerified,
      };
    });

    return { tabs: sanitizedTabs, artists: sanitizedArtists };
  }),

  getTabTitlesBySearchQuery: publicProcedure
    .input(z.string())
    .query(async ({ input: query, ctx }) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return []; // Handle empty query
      }

      const tsQuery = Prisma.sql`websearch_to_tsquery('english', ${trimmedQuery})`;
      // Pattern for ILIKE prefix match (case-insensitive)
      const prefixPattern = `${trimmedQuery}%`;

      try {
        const results = await ctx.prisma.$queryRaw<TabWithArtistRank[]>`
          SELECT
            "Tab".id,
            "Tab".title,
            "Tab"."genreId",
            "Tab"."artistId",
            "Artist"."name" AS "artistName",
            "Artist"."isVerified" AS "artistIsVerified",
            ts_rank_cd("Tab"."searchVector", ${tsQuery}) AS rank
          FROM
            "Tab"
          LEFT JOIN
            "Artist" ON "Tab"."artistId" = "Artist"."id"
          WHERE
            -- Match EITHER the FTS vector OR the title prefix
            ("Tab"."searchVector" @@ ${tsQuery})
            OR
            ("Tab".title ILIKE ${prefixPattern})
          ORDER BY
            -- Prioritize prefix matches, then exact, then others
            CASE
              -- Assign 0 if title starts with the query (case-insensitive)
              WHEN "Tab".title ILIKE ${prefixPattern} THEN 0
              ELSE 1 -- 1 for others
            END ASC, -- Sort by priority (0 comes first)
            rank DESC, -- Then sort by FTS relevance score
            "Tab".title ASC -- Final tie-breaker by title alphabetically
          LIMIT 5;
        `;

        return results;
      } catch (error) {
        console.error("Error searching tabs:", error);
        throw error;
      }
    }),

  getArtistUsernamesBySearchQuery: publicProcedure
    .input(z.string())
    .query(async ({ input: query, ctx }) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return []; // Handle empty query
      }

      // FYI: multiple artists with the same name can exist. Not using
      // distinct here because we want to show all of them, but I know
      // it's not the best approach.
      try {
        const results = await ctx.prisma.artist.findMany({
          where: {
            OR: [
              {
                // Condition 1: Name starts with the query
                name: {
                  startsWith: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                // Condition 2: Name contains the query
                name: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
          orderBy: {
            name: "asc",
          },
          take: 5,
        });

        console.log(`Found ${results.length} artists for "${trimmedQuery}":`);
        results.forEach((artist) => {
          console.log(
            `- ID: ${artist.id}, Name: ${artist.name}, Verified: ${artist.isVerified}`,
          );
        });

        return results;
      } catch (error) {
        console.error("Error searching artists with ILIKE:", error);
        throw error;
      }
    }),

  getInfiniteTabsBySearchQuery: publicProcedure
    .input(
      z.object({
        searchQuery: z.string().optional(),
        genreId: z.number().optional(),
        tuning: z.string().optional(),
        difficulty: z.number().int().min(1).max(5).optional(),
        capo: z.boolean().optional(),
        sortBy: z.enum([
          "relevance", // Only valid if searchQuery is present
          "newest",
          "oldest",
          "mostPopular",
          "leastPopular",
        ]),
        userIdToSelectFrom: z.string().optional(), // Filter by creator
        artistIdToSelectFrom: z.number().optional(), // Filter by artist
        bookmarkedByUserId: z.string().optional(), // Filter by bookmarker
        limit: z.number().min(1).max(50).optional().default(15),
        // Cursor can be ID (for Prisma findMany) or page number (for raw FTS)
        // We'll treat null/undefined as the first page (page 0 or no ID cursor)
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const {
        searchQuery,
        genreId,
        tuning,
        difficulty,
        capo,
        sortBy,
        userIdToSelectFrom,
        artistIdToSelectFrom,
        bookmarkedByUserId,
        limit,
        cursor,
      } = input;

      const trimmedQuery = searchQuery?.trim();
      const useFts = sortBy === "relevance" && !!trimmedQuery;

      // --- FTS Relevance Search Path (using $queryRaw) ---
      if (useFts && trimmedQuery) {
        const tsQuery = Prisma.sql`websearch_to_tsquery('english', ${trimmedQuery})`;
        const prefixPattern = `${trimmedQuery}%`;
        const page = cursor ?? 0; // Treat cursor as page number for FTS
        const offset = page * limit;

        // Build WHERE conditions dynamically and safely
        const conditions = [
          Prisma.sql`("Tab"."searchVector" @@ ${tsQuery} OR "Tab"."title" ILIKE ${prefixPattern})`,
        ];

        if (genreId !== undefined) {
          conditions.push(Prisma.sql`"Tab"."genreId" = ${genreId}`);
        }
        if (tuning !== undefined) {
          if (tuning === "custom") {
            conditions.push(
              Prisma.sql`"Tab"."tuning" NOT IN (${Prisma.join(tuningNotes.map((t) => Prisma.sql`${t}`))})`,
            );
          } else {
            conditions.push(Prisma.sql`"Tab"."tuning" = ${tuning}`);
          }
        }
        if (difficulty !== undefined) {
          conditions.push(Prisma.sql`"Tab"."difficulty" = ${difficulty}`);
        }
        if (capo !== undefined) {
          conditions.push(
            Prisma.sql`"Tab"."capo" ${capo ? Prisma.sql`>` : Prisma.sql`=`} 0`,
          );
        }
        if (userIdToSelectFrom !== undefined) {
          conditions.push(
            Prisma.sql`"Tab"."createdByUserId" = ${userIdToSelectFrom}`,
          );
        }
        if (artistIdToSelectFrom !== undefined) {
          conditions.push(
            Prisma.sql`"Tab"."artistId" = ${artistIdToSelectFrom}`,
          );
        }
        if (bookmarkedByUserId !== undefined) {
          conditions.push(
            Prisma.sql`EXISTS (SELECT 1 FROM "Bookmark" WHERE "Bookmark"."tabId" = "Tab"."id" AND "Bookmark"."bookmarkedByUserId" = ${bookmarkedByUserId})`,
          );
        }

        const whereClause =
          conditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
            : Prisma.empty;

        // FTS specific ORDER BY
        const orderByClause = Prisma.sql`ORDER BY
          CASE
            WHEN "Tab"."title" ILIKE ${prefixPattern} THEN 0
            ELSE 1
          END ASC,
          ts_rank_cd("Tab"."searchVector", ${tsQuery}) DESC,
          "Tab"."title" ASC`;

        const selectFields = Prisma.sql`
          "Tab"."id", "Tab"."title", "Tab"."genreId",
          "Tab"."createdAt", "Tab"."difficulty",
          "Tab"."averageRating", "Tab"."ratingsCount",
          "Tab"."artistId",
          "Artist"."name" AS "artistName",
          "Artist"."isVerified" AS "artistIsVerified",
          "User"."username" AS "createdByUsername",
          ts_rank_cd("Tab"."searchVector", ${tsQuery}) AS rank
      `;

        const dataQuery = Prisma.sql`
        SELECT ${selectFields}
        FROM "Tab"
        LEFT JOIN "Artist" ON "Tab"."artistId" = "Artist"."id"
        LEFT JOIN "User" ON "Tab"."createdByUserId" = "User"."userId"
        ${whereClause}
        ${orderByClause}
        LIMIT ${limit}
        OFFSET ${offset};
      `;

        const countQuery = Prisma.sql`
        SELECT COUNT(*)
        FROM "Tab"
        ${whereClause};
      `;

        try {
          const [results, countResult] = await ctx.prisma.$transaction([
            ctx.prisma.$queryRaw<MinimalTabRepresentation[]>(dataQuery),
            ctx.prisma.$queryRaw<{ count: bigint }[]>(countQuery),
          ]);

          const totalCount = Number(countResult[0]?.count ?? 0);
          const nextPage =
            offset + results.length < totalCount ? page + 1 : null;

          return {
            data: {
              tabs: results,
              // For FTS/offset pagination, the next "cursor" is the next page number
              nextCursor: nextPage,
            },
            count: totalCount,
          };
        } catch (error) {
          console.error("Error executing raw FTS query:", error);
          // Consider throwing a TRPCError for client feedback
          throw new Error("Failed to search tabs");
        }
      }

      // --- Standard Prisma findMany Path (Non-FTS or no query) ---
      else {
        const where: Prisma.TabWhereInput = {};

        // Apply filters
        if (trimmedQuery) {
          // Basic contains search if not using FTS relevance sort
          where.title = { contains: trimmedQuery, mode: "insensitive" };
        }
        if (genreId !== undefined) {
          where.genreId = genreId;
        }
        if (tuning !== undefined) {
          if (tuning === "custom") {
            where.tuning = { notIn: tuningNotes };
          } else {
            where.tuning = tuning;
          }
        }
        if (difficulty !== undefined) {
          where.difficulty = difficulty;
        }
        if (capo !== undefined) {
          where.capo = capo ? { gt: 0 } : { equals: 0 };
        }
        if (userIdToSelectFrom !== undefined) {
          where.createdByUserId = userIdToSelectFrom;
        }
        if (artistIdToSelectFrom !== undefined) {
          where.artistId = artistIdToSelectFrom;
        }
        if (bookmarkedByUserId !== undefined) {
          where.bookmarks = {
            some: { bookmarkedByUserId: bookmarkedByUserId },
          };
        }

        // Build OrderBy for Prisma
        let orderBy: Prisma.TabOrderByWithRelationInput | undefined = undefined;
        switch (sortBy) {
          case "newest":
            orderBy = { createdAt: "desc" };
            break;
          case "oldest":
            orderBy = { createdAt: "asc" };
            break;
          case "mostPopular":
            orderBy = { pageViews: "desc" };
            break;
          case "leastPopular":
            orderBy = { pageViews: "asc" };
            break;
          case "relevance": // Should have been handled by FTS path if query exists
          default:
            // Fallback: No specific order or default DB order
            // Prisma requires *some* order for cursor pagination, usually ID
            orderBy = { id: "asc" }; // Use ID as a default stable sort for cursor
            break;
        }

        try {
          const [count, tabs] = await ctx.prisma.$transaction([
            ctx.prisma.tab.count({ where }),
            ctx.prisma.tab.findMany({
              where,
              orderBy,
              take: limit + 1, // Fetch one extra to determine next cursor
              cursor: cursor ? { id: cursor } : undefined, // ID-based cursor
              select: {
                id: true,
                title: true,
                genreId: true,
                createdAt: true,
                difficulty: true,
                averageRating: true,
                ratingsCount: true,
                artist: {
                  select: {
                    id: true,
                    name: true,
                    isVerified: true,
                  },
                },
                createdBy: {
                  select: {
                    userId: true,
                    username: true,
                  },
                },
              },
            }),
          ]);

          let nextCursor: number | null = null;
          if (tabs.length > limit) {
            const nextItem = tabs.pop(); // Remove the extra item
            if (nextItem) {
              nextCursor = nextItem.id; // Use its ID as the next cursor
            }
          }

          const sanitizedTabs: MinimalTabRepresentation[] = tabs.map((tab) => {
            const conditionalArtist = tab.artist
              ? {
                  id: tab.artist.id,
                  name: tab.artist.name,
                  isVerified: tab.artist.isVerified,
                }
              : null;

            const conditionalCreatedBy = tab.createdBy
              ? {
                  userId: tab.createdBy.userId,
                  username: tab.createdBy.username,
                }
              : null;

            return {
              ...tab,
              artist: conditionalArtist,
              createdBy: conditionalCreatedBy,
            };
          });

          return {
            data: {
              tabs: sanitizedTabs,
              nextCursor: nextCursor,
            },
            count: count,
          };
        } catch (error) {
          console.error("Error executing Prisma tab query:", error);
          // Consider throwing a TRPCError
          throw new Error("Failed to fetch tabs");
        }
      }
    }),
});
