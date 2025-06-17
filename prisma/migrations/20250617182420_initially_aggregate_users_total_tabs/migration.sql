-- Update each user's totalTabs based on the number of tabs they've created
UPDATE "User" u
SET "totalTabs" = COALESCE(tab_counts.count, 0)
FROM (
    SELECT "createdByUserId", COUNT(*) AS count
    FROM "Tab"
    WHERE "createdByUserId" IS NOT NULL
    GROUP BY "createdByUserId"
) AS tab_counts
WHERE u."userId" = tab_counts."createdByUserId";