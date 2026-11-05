import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

export async function requireSignedInUser() {
  const { userId } = await auth();
  if (!userId) notFound();
  return userId;
}
