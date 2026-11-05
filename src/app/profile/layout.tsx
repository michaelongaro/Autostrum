import type { ReactNode } from "react";
import { requireSignedInUser } from "~/server/auth";

export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSignedInUser();
  return children;
}
