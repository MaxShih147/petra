// Dinosaur group silhouettes — PhyloPic (CC0) SVGs stored as static files
// Fetched via: npm run fetch-silhouettes

const SILHOUETTE_URLS: Record<string, string> = {
  theropod: "/silhouettes/theropod.svg",
  sauropod: "/silhouettes/sauropod.svg",
  ceratopsian: "/silhouettes/ceratopsian.svg",
  hadrosaur: "/silhouettes/hadrosaur.svg",
  ankylosaur: "/silhouettes/ankylosaur.svg",
  stegosaur: "/silhouettes/stegosaur.svg",
  ornithopod: "/silhouettes/ornithopod.svg",
  pachycephalosaur: "/silhouettes/pachycephalosaur.svg",
  ornithomimosaur: "/silhouettes/ornithomimosaur.svg",
  oviraptorosaur: "/silhouettes/oviraptorosaur.svg",
  bird: "/silhouettes/bird.svg",
  trace: "/silhouettes/trace.svg",
  unknown: "/silhouettes/unknown.svg",
};

export function getSilhouette(group: string | undefined): string {
  if (!group) return SILHOUETTE_URLS.unknown;
  const key = group.toLowerCase().trim();
  return SILHOUETTE_URLS[key] || SILHOUETTE_URLS.unknown;
}
