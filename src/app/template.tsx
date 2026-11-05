import type { ReactNode } from "react";
import RouteContent from "~/components/Layout/RouteContent";

export default function Template({ children }: { children: ReactNode }) {
  return <RouteContent>{children}</RouteContent>;
}
