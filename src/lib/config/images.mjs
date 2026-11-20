// Shared by next.config and cards, so custom video-source posters can keep
// loading directly without opening the optimizer to arbitrary remote hosts.
export const remoteImagePatterns = [
  { protocol: "https", hostname: "**.doubanio.com" },
  { protocol: "https", hostname: "tncache1-f1.v3mh.com" },
  { protocol: "https", hostname: "lh3.googleusercontent.com" },
];

export function canOptimizeImage(src) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && remoteImagePatterns.some(({ hostname }) =>
      hostname.startsWith("**.") ? url.hostname.endsWith(hostname.slice(2)) : url.hostname === hostname,
    );
  } catch {
    return false;
  }
}
