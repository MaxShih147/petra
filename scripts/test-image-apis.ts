/**
 * Debug individual API strategies for specific genera.
 */

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}

// Test Commons with different search strategies
async function testCommons(genus: string) {
  // Strategy A: search files directly
  const urlA = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(genus)}&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json&origin=*`;
  const dataA = await fetchJson(urlA);
  const pagesA = dataA?.query?.pages;
  if (pagesA) {
    for (const p of Object.values(pagesA) as any[]) {
      const info = p?.imageinfo?.[0];
      if (info?.mime?.startsWith("image/")) {
        console.log(`  Commons file search: ${info.thumburl?.slice(0, 80)}...`);
        return info.thumburl;
      }
    }
  }

  // Strategy B: search categories
  const urlB = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:${encodeURIComponent(genus)}&gcmtype=file&gcmlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json&origin=*`;
  const dataB = await fetchJson(urlB);
  const pagesB = dataB?.query?.pages;
  if (pagesB) {
    for (const p of Object.values(pagesB) as any[]) {
      const info = p?.imageinfo?.[0];
      if (info?.mime?.startsWith("image/")) {
        console.log(`  Commons category: ${info.thumburl?.slice(0, 80)}...`);
        return info.thumburl;
      }
    }
  }

  console.log("  Commons: nothing");
  return null;
}

// Test PhyloPic v2 API
async function testPhyloPic(genus: string) {
  const url = `https://api.phylopic.org/autocomplete?query=${encodeURIComponent(genus)}&build=292`;
  const data = await fetchJson(url);
  console.log(`  PhyloPic autocomplete:`, JSON.stringify(data).slice(0, 200));

  // Try images endpoint
  const url2 = `https://api.phylopic.org/images?filter_name=${encodeURIComponent(genus)}&page=0&embed_items=true`;
  const data2 = await fetchJson(url2);
  const items = data2?._embedded?.items;
  if (items?.length > 0) {
    const img = items[0];
    const svgLink = img?._links?.vectorFile?.href;
    const rasterLink = img?._links?.thumbnailFiles?.[0]?.href;
    console.log(`  PhyloPic image: svg=${svgLink} raster=${rasterLink}`);
    if (svgLink) return `https://images.phylopic.org${svgLink}`;
    if (rasterLink) return `https://images.phylopic.org${rasterLink}`;
  } else {
    console.log("  PhyloPic: no images found");
  }
  return null;
}

async function main() {
  const testCases = ["Parapavo", "Chaoyangia", "Neoanomoepus", "Atreipus", "Tyrannosaurus", "Deinonychus"];

  for (const genus of testCases) {
    console.log(`\n=== ${genus} ===`);
    await testCommons(genus);
    await testPhyloPic(genus);
  }
}

main().catch(console.error);
