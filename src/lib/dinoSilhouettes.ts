// Simplified dinosaur group silhouettes as SVG path data (24x24 viewBox)
// Hand-drawn minimal outlines for each major group

export const DINO_SILHOUETTES: Record<string, string> = {
  // T-rex style bipedal predator
  theropod:
    "M3 18h2l1-3 2 1 3-1 2-4 3-2 2 1 1-1V7l-1-1h-2l-1 1-1 3-2 2-3 1-2 2v2l-2 1z",
  // Long-necked quadruped
  sauropod:
    "M2 17h3l1-2h4l2-1 2-3 1-3V6l-1-2-1 1-1 3-1 2H9L7 11 5 13l-2 2z",
  // Triceratops-style horned face
  ceratopsian:
    "M4 18h8l3-2 2-3 1-2-1-2-2-1-1-2h-1l-2 1-1-1H8L6 8 4 9 3 11v4z",
  // Duck-billed hadrosaur
  hadrosaur:
    "M3 18h3l2-3 3-2 2-1 2 1 1-1 1-3-1-2-2-1-1-2-2 1-3 2-2 3v4z",
  // Armored low-slung tank
  ankylosaur:
    "M2 16h4l2 1h4l3-1 2-2 1-2v-2l-1-1H6L4 10 2 12v4zm14-3 2 1 1-1-1-1z",
  // Plated back with tail spikes
  stegosaur:
    "M2 17h3l2-2 2-1 2 1 2-1 2-2 2-1 1-2-1-2-2 1-1 2-3-1-2 1-1 2zm4-7 1-2 2 1zm4 0 1-2 2 1zm-2-2 1-3 1 2z",
  // Generic bipedal herbivore
  ornithopod:
    "M5 18h2l1-3 2-2 2-1 1 1 1-2v-3l-1-1-2 1-2 2-2 3v3z",
  // Thick-skulled dome head
  pachycephalosaur:
    "M6 18h2l1-3 2-2 2-1 1-2v-1a3 3 0 1 0-5-1L7 10 5 13v3z",
  // Fast runner with long legs
  ornithomimosaur:
    "M5 18h1l1-4 1-3 2-2 2-1 1 1 1-2V5l-1-1-1 1-1 2-2 3-1 4v4z",
  // Small beaked with crest
  oviraptorosaur:
    "M5 18h2l1-3 2-2 2-1 1-1v-2l1-2-1-1-2 1-2 2-2 3v4zm6-10 1-2 0 2z",
  // Flying/perching bird
  bird:
    "M7 18l1-3 2-2 3-1 2-3-1-2-2 1-1 2-2 1-1 2v4zm5-8 2-1 1 1z",
  // Footprint/trackway
  trace:
    "M9 6v3l-2 3-1 3h1l2-2v3l-1 3h2l1-3v-3l2 2h1l-1-3-2-3V6a2 2 0 0 0-2 0z",
  // Question mark for unknown
  unknown:
    "M10 5a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0c0 1-1 2-2 3v2h2v-1l2-2a4 4 0 0 0-4-6zm-1 11h2v2h-2z",
};

export function getSilhouette(group: string | undefined): string {
  if (!group) return DINO_SILHOUETTES.unknown;
  const key = group.toLowerCase().trim();
  return DINO_SILHOUETTES[key] || DINO_SILHOUETTES.unknown;
}
