-- Rename the column in the "Tab" table
ALTER TABLE "Tab" RENAME COLUMN "createdById" TO "createdByUserId";

-- Rename the foreign key constraint to match the new column name (good practice)
-- NOTE: Verify the *exact* original constraint name in your DB if unsure.
-- Prisma's default naming convention is usually TableName_ColumnName_fkey
ALTER TABLE "Tab" RENAME CONSTRAINT "Tab_createdById_fkey" TO "Tab_createdByUserId_fkey";