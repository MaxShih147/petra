import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { optimize } from "svgo";

const OUT_DIR = join(process.cwd(), "public", "silhouettes");

// Representative species for each dinosaur group (lowercase for PhyloPic API)
const PHYLOPIC_GROUPS: Record<string, string> = {
  theropod: "tyrannosaurus rex",
  sauropod: "brachiosaurus",
  ceratopsian: "triceratops",
  hadrosaur: "parasaurolophus",
  ankylosaur: "ankylosaurus",
  stegosaur: "stegosaurus",
  ornithopod: "iguanodon",
  pachycephalosaur: "pachycephalosaurus",
  ornithomimosaur: "ornithomimus",
  oviraptorosaur: "oviraptor",
  bird: "archaeopteryx",
};

async function fetchPhyloPicSvg(name: string): Promise<string> {
  // Search for images matching the taxon name
  const searchUrl = `https://api.phylopic.org/images?filter_name=${encodeURIComponent(name)}`;
  console.log(`  Searching PhyloPic for "${name}"...`);
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PhyloPic search failed: ${searchRes.status}`);

  const searchData = await searchRes.json();
  const totalItems = searchData.totalItems;
  if (!totalItems || totalItems === 0) {
    throw new Error(`No PhyloPic images found for "${name}"`);
  }

  // Get the first page with embedded items to find the first image UUID
  const build = searchData.build;
  const pageUrl = `https://api.phylopic.org/images?filter_name=${encodeURIComponent(name)}&build=${build}&page=0`;
  const pageRes = await fetch(pageUrl);
  if (!pageRes.ok) throw new Error(`PhyloPic page fetch failed: ${pageRes.status}`);

  const pageData = await pageRes.json();
  const items = pageData._links?.items;
  if (!items || items.length === 0) {
    throw new Error(`No image items found for "${name}"`);
  }

  // Extract UUID from the first item's href (e.g., /images/{uuid}?build=536)
  const href: string = items[0].href;
  const match = href.match(/\/images\/([a-f0-9-]+)/);
  if (!match) throw new Error(`Could not extract UUID from: ${href}`);
  const uuid = match[1];

  // Download the vector SVG (optimized/smaller than source.svg)
  const svgUrl = `https://images.phylopic.org/images/${uuid}/vector.svg`;
  console.log(`  Downloading: ${uuid}`);
  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) throw new Error(`SVG download failed: ${svgRes.status}`);

  return await svgRes.text();
}

function optimizeSvg(svg: string): string {
  const result = optimize(svg, {
    multipass: true,
    plugins: [
      "preset-default",
      "removeDimensions",
    ],
  });
  return result.data;
}

// Hand-crafted SVGs for non-phylopic groups
const STATIC_SVGS: Record<string, string> = {
  // Dinosaur footprint (three-toed theropod track)
  trace: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<path fill="#000" d="M50 8c-3 0-5 4-6 10l-2 12-4-10c-2-5-5-8-8-7s-3 6-1 12l5 14-8-6c-4-3-8-4-9-1s1 7 5 11l12 10-3 2c-4 3-6 8-5 14 1 8 6 15 13 19 4 2 8 3 12 3s8-1 12-3c7-4 12-11 13-19 1-6-1-11-5-14l-3-2 12-10c4-4 6-8 5-11s-5-2-9 1l-8 6 5-14c2-6 2-12-1-12s-6 2-8 7l-4 10-2-12c-1-6-3-10-6-10z"/>
</svg>`,
  // Dinosaur skeleton fossil silhouette
  unknown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<path fill="#000" d="M72 20c-3 0-6 1-8 3l-4 4-8-2c-3-1-6 0-8 2L30 41c-2 2-3 5-2 8l1 4-6 6c-2 2-3 5-2 7l2 6-4 4c-1 2-2 4-1 6l2 6H8c-2 0-4 2-4 4s2 4 4 4h20c1 0 3-1 3-2l4-6h8l4 6c1 1 2 2 3 2h20c2 0 4-2 4-4s-2-4-4-4h-12l2-6c1-2 0-4-1-6l-4-4 2-6c1-2 0-5-2-7l-6-6 1-4c1-3 0-6-2-8L44 27l-4-2 4-4c4-4 10-4 14 0l6 6c2 2 5 2 7 0s2-5 0-7l-6-6c-4-4-10-5-15-4l2-2a4 4 0 0 1 6 0l10 10c2 2 5 2 7 0s2-5 0-7L66 3c-4-4-10-4-14 0l-4 4c-1-3-4-5-7-4L26 7c-2 0-4 2-4 4s1 4 3 5l12 4-6 6 8 8 8-8 6 2c2 1 4 0 6-2l6-6c5 1 9 5 9 10 0 6-5 10-10 10-2 0-4 2-4 4s2 4 4 4c10 0 18-8 18-18 0-8-6-16-14-18z"/>
</svg>`,
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Output directory: ${OUT_DIR}\n`);

  let success = 0;
  let failed = 0;

  // Fetch PhyloPic silhouettes
  for (const [group, species] of Object.entries(PHYLOPIC_GROUPS)) {
    try {
      console.log(`[${group}]`);
      const rawSvg = await fetchPhyloPicSvg(species);
      const optimized = optimizeSvg(rawSvg);
      const outPath = join(OUT_DIR, `${group}.svg`);
      writeFileSync(outPath, optimized);
      console.log(`  Saved: ${group}.svg (${optimized.length} bytes)\n`);
      success++;
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}\n`);
      failed++;
    }
  }

  // Write static SVGs for trace and unknown
  for (const [group, svg] of Object.entries(STATIC_SVGS)) {
    try {
      console.log(`[${group}]`);
      const optimized = optimizeSvg(svg);
      const outPath = join(OUT_DIR, `${group}.svg`);
      writeFileSync(outPath, optimized);
      console.log(`  Saved: ${group}.svg (${optimized.length} bytes)\n`);
      success++;
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}\n`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
