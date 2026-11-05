"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

/** Reactive URL state for screens that use both route and search parameters. */
export function useRouteLocation() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const query = useMemo(() => {
    const result: Record<string, string | string[] | undefined> = {};
    const searchValues = new URLSearchParams(search);
    for (const key of searchValues.keys()) {
      const values = searchValues.getAll(key);
      result[key] = values.length === 1 ? values[0] : values;
    }
    // Route parameters take priority over identically named search parameters.
    return { ...result, ...params };
  }, [params, search]);
  return { pathname, asPath: pathname + (search ? `?${search}` : ""), query };
}
