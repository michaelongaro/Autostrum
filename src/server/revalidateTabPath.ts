import { revalidatePath } from "next/cache";

export async function revalidateTabPath(path: string) {
  revalidatePath(path);
}
