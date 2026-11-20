export function catalogRequestUrl(sourceUrl, params) {
  const url = new URL(sourceUrl);
  for (const field of ["wd", "ids", "pg", "t"]) url.searchParams.delete(field);
  url.searchParams.set("ac", "detail");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.hash = "";
  return url;
}
