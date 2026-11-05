/** Build filter URLs without copying dynamic route parameters into the query. */
export function routeUrl(
  pathname: string,
  query: Record<string, string | string[] | number | boolean | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (
      ["filters", "id", "name", "username"].includes(key) ||
      value === undefined
    )
      continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, String(item));
    }
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path + (search.size ? `?${search}` : "");
}
