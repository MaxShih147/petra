/**
 * Test image coverage across different APIs for a sample of genera.
 * Usage: npx tsx scripts/test-image-coverage.ts
 */

const SAMPLE_SIZE = 50;

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}

// Strategy 1: Wikipedia pageimages (current approach)
async function tryWikipedia(genus: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(genus)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*`;
    const data = await fetchJson(url);
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// Strategy 2: Wikimedia Commons search
async function tryCommonsSearch(genus: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(genus + " fossil")}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`;
    const data = await fetchJson(url);
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    return page?.imageinfo?.[0]?.thumburl || null;
  } catch {
    return null;
  }
}

// Strategy 3: iNaturalist (best for birds/extant species)
async function tryINaturalist(genus: string): Promise<string | null> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(genus)}&rank=genus&per_page=1`;
    const data = await fetchJson(url);
    const result = data?.results?.[0];
    if (!result?.default_photo?.medium_url) return null;
    return result.default_photo.medium_url;
  } catch {
    return null;
  }
}

// Strategy 4: PhyloPic (silhouettes)
async function tryPhyloPic(genus: string): Promise<string | null> {
  try {
    const url = `https://api.phylopic.org/nodes?filter_name=${encodeURIComponent(genus)}&page=0`;
    const data = await fetchJson(url);
    const node = data?._links?.items?.[0];
    if (!node?.href) return null;
    // Get the node details to find image
    const nodeData = await fetchJson(`https://api.phylopic.org${node.href}?embed_primaryImage=true`);
    const img = nodeData?._embedded?.primaryImage;
    if (!img?._links?.rasterFiles) return null;
    // Get a reasonably sized raster
    const rasters = img._links.rasterFiles;
    const raster = rasters.find((r: any) => r.sizes?.includes("512x512")) || rasters[0];
    return raster?.href ? `https://api.phylopic.org${raster.href}` : null;
  } catch {
    return null;
  }
}

async function main() {
  // Load genera from data
  const { execSync } = await import("child_process");
  const raw = execSync(
    "gunzip -c public/data/dinosaurs.geojson.gz",
    { maxBuffer: 100 * 1024 * 1024 }
  ).toString();
  const data = JSON.parse(raw);

  // Group genera by category
  const byGroup: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const f of data.features) {
    const genus = f.properties.taxonomyGenus;
    const group = f.properties.group;
    if (!genus || seen.has(genus)) continue;
    seen.add(genus);
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(genus);
  }

  // Sample: pick from dinosaurs, birds, and traces
  const sample: { genus: string; group: string }[] = [];
  const pick = (group: string, n: number) => {
    const genera = byGroup[group] || [];
    const shuffled = genera.sort(() => Math.random() - 0.5).slice(0, n);
    for (const g of shuffled) sample.push({ genus: g, group });
  };

  pick("theropod", 15);
  pick("sauropod", 5);
  pick("ceratopsian", 5);
  pick("bird", 15);
  pick("trace", 5);
  pick("hadrosaur", 5);

  console.log(`Testing ${sample.length} genera...\n`);

  const results: Record<string, { wp: number; commons: number; inat: number; phylo: number; any: number; total: number }> = {};

  for (const { genus, group } of sample) {
    if (!results[group]) results[group] = { wp: 0, commons: 0, inat: 0, phylo: 0, any: 0, total: 0 };
    results[group].total++;

    const wp = await tryWikipedia(genus);
    const commons = !wp ? await tryCommonsSearch(genus) : null;
    const inat = (!wp && !commons) ? await tryINaturalist(genus) : null;
    const phylo = (!wp && !commons && !inat) ? await tryPhyloPic(genus) : null;

    if (wp) results[group].wp++;
    if (commons) results[group].commons++;
    if (inat) results[group].inat++;
    if (phylo) results[group].phylo++;
    if (wp || commons || inat || phylo) results[group].any++;

    const source = wp ? "WP" : commons ? "CM" : inat ? "iNat" : phylo ? "Phylo" : "NONE";
    console.log(`[${source.padEnd(5)}] ${group.padEnd(15)} ${genus}`);
  }

  console.log("\n=== Coverage Summary ===");
  let totalAny = 0, totalAll = 0;
  for (const [group, r] of Object.entries(results)) {
    const pct = ((r.any / r.total) * 100).toFixed(0);
    console.log(`${group.padEnd(15)} ${r.any}/${r.total} (${pct}%) — WP:${r.wp} CM:${r.commons} iNat:${r.inat} Phylo:${r.phylo}`);
    totalAny += r.any;
    totalAll += r.total;
  }
  console.log(`${"TOTAL".padEnd(15)} ${totalAny}/${totalAll} (${((totalAny / totalAll) * 100).toFixed(0)}%)`);
}

main().catch(console.error);
