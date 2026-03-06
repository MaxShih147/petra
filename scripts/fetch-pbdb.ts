import { writeFileSync } from "fs";
import { join } from "path";

const PBDB_URL =
  "https://paleobiodb.org/data1.2/occs/list.json?base_name=Dinosauria&limit=all&show=coords,loc,time,strat,classext&vocab=pbdb";

interface PBDBRecord {
  occurrence_no: number;
  accepted_no: number;
  accepted_name: string;
  accepted_rank: string;
  identified_rank?: string;
  genus?: string;
  lng: number;
  lat: number;
  early_interval: string;
  late_interval?: string;
  max_ma: number;
  min_ma: number;
  formation?: string;
  cc?: string;
  state?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
}

// Trace fossil / egg families (ichnofossils & oofossils)
const TRACE_FAMILIES = new Set([
  "Grallatoridae", "Eubrontidae", "Iguanodontipodidae", "Moyenisauropodidae",
  "Ornithomimipodidae", "Parabrontopodidae", "Tetrapodosauridae",
  "Dromaeopodidae", "Avipedidae", "Koreanaornipodidae", "Anomoepodidae",
  "Anchisauripodidae", "Tyrannosauripodidae", "Delatorrichnopodidae",
  "Limiavipedidae", "Jindongornipodidae", "Psittacopedidae",
  "Paxavipedidae", "Shandongornipodidae", "Otozoidae",
  // Egg families (oolithidae)
  "Elongatoolithidae", "Megaloolithidae", "Prismatoolithidae",
  "Spheroolithidae", "Fusioolithidae", "Faveoloolithidae",
  "Ovaloolithidae", "Stalicoolithidae", "Dictyoolithidae",
  "Cairanoolithidae", "Laevisoolithidae", "Montanoolithidae",
  "Phaceloolithidae", "Pinnatoolithidae", "Dongyangoolithidae",
  "Gobioolithidae", "Similifaveoloolithidae", "Dendroolithidae",
  "Youngoolithidae", "Arriagadoolithidae", "Polyclonoolithidae",
  "Pachycorioolithidae", "Oblongoolithidae",
]);

// Theropod families (non-avian carnivorous dinosaurs)
const THEROPOD_FAMILIES = new Set([
  "Tyrannosauridae", "Dromaeosauridae", "Abelisauridae", "Spinosauridae",
  "Megalosauridae", "Carcharodontosauridae", "Compsognathidae",
  "Coelophysidae", "Herrerasauridae", "Megaraptoridae", "Ceratosauridae",
  "Piatnitzkysauridae", "Proceratosauridae", "Metriacanthosauridae",
  "Neovenatoridae", "Noasauridae", "Allosauridae", "Nqwebasauridae",
]);

// Ornithomimosaur + allies
const ORNITHOMIMOSAUR_FAMILIES = new Set([
  "Ornithomimidae", "Deinocheiridae", "Alvarezsauridae",
]);

// Oviraptorosaur + allies
const OVIRAPTOROSAUR_FAMILIES = new Set([
  "Oviraptoridae", "Caenagnathidae", "Therizinosauridae",
  "Caudipterygidae", "Scansoriopterygidae",
]);

// Sauropod families
const SAUROPOD_FAMILIES = new Set([
  "Diplodocidae", "Brachiosauridae", "Camarasauridae", "Saltasauridae",
  "Mamenchisauridae", "Rebbachisauridae", "Titanosauridae", "Euhelopodidae",
  "Dicraeosauridae", "Cetiosauridae", "Nemegtosauridae", "Sauropodidae",
  "Pakisauridae", "Gspsauridae", "Balochisauridae", "Vitakrisauridae",
  // Early sauropodomorphs
  "Plateosauridae", "Massospondylidae", "Anchisauridae", "Riojasauridae",
  "Thecodontosauridae", "Lessemsauridae", "Saturnaliidae", "Guaibasauridae",
  "Unaysauridae",
]);

// Ceratopsian families
const CERATOPSIAN_FAMILIES = new Set([
  "Ceratopsidae", "Protoceratopsidae", "Leptoceratopsidae",
  "Chaoyangsauridae",
]);

// Ornithopod families
const ORNITHOPOD_FAMILIES = new Set([
  "Iguanodontidae", "Tenontosauridae", "Dryosauridae", "Rhabdodontidae",
  "Hypsilophodontidae", "Thescelosauridae", "Parksosauridae",
  "Jeholosauridae", "Heterodontosauridae", "Fabrosauridae",
]);

function classifyGroup(r: PBDBRecord): string {
  const family = r.family || "";

  // Check trace/egg fossils first
  if (TRACE_FAMILIES.has(family)) return "trace";

  // Check specific family sets
  if (THEROPOD_FAMILIES.has(family)) return "theropod";
  if (ORNITHOMIMOSAUR_FAMILIES.has(family)) return "ornithomimosaur";
  if (OVIRAPTOROSAUR_FAMILIES.has(family)) return "oviraptorosaur";
  if (SAUROPOD_FAMILIES.has(family)) return "sauropod";
  if (CERATOPSIAN_FAMILIES.has(family)) return "ceratopsian";
  if (family === "Hadrosauridae") return "hadrosaur";
  if (family === "Ankylosauridae" || family === "Nodosauridae") return "ankylosaur";
  if (family === "Stegosauridae") return "stegosaur";
  if (family === "Pachycephalosauridae") return "pachycephalosaur";
  if (ORNITHOPOD_FAMILIES.has(family)) return "ornithopod";

  // Fall back to class-level
  if (r.class === "Aves") return "bird";
  if (r.class === "Ornithischia") return "ornithopod";
  if (r.class === "Saurischia") return "theropod";

  return "unknown";
}

async function main() {
  console.log("Fetching dinosaur occurrences from PBDB...");
  const res = await fetch(PBDB_URL);
  if (!res.ok) throw new Error(`PBDB responded with ${res.status}`);

  const json = await res.json();
  const records: PBDBRecord[] = json.records;
  console.log(`Received ${records.length} raw records`);

  const groupCounts: Record<string, number> = {};
  const features: GeoJSONFeature[] = [];

  for (const r of records) {
    if (r.lng == null || r.lat == null) continue;

    const rank = r.identified_rank ?? r.accepted_rank;
    if (rank !== "species" && rank !== "genus") continue;
    if (r.accepted_name.includes("indet.")) continue;

    const genus = r.genus ?? r.accepted_name.split(" ")[0];
    const nameParts = r.accepted_name.split(" ");
    const species = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";

    const locationParts: string[] = [];
    if (r.state) locationParts.push(r.state);
    if (r.cc) locationParts.push(r.cc);
    const location = locationParts.join(", ") || "Unknown";

    const group = classifyGroup(r);
    groupCounts[group] = (groupCounts[group] || 0) + 1;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(r.lng), Number(r.lat)],
      },
      properties: {
        id: String(r.occurrence_no),
        name: r.accepted_name,
        commonName: genus,
        period: r.early_interval,
        age: `${r.max_ma}–${r.min_ma} Ma`,
        formation: r.formation || "Unknown",
        location,
        group,
        taxonomyClass: r.class || "Unknown",
        taxonomyOrder: r.order || "Unknown",
        taxonomyFamily: r.family || "Unknown",
        taxonomyGenus: genus,
        taxonomySpecies: species,
        pbdbUrl: `https://paleobiodb.org/classic/checkTaxonInfo?taxon_no=${r.accepted_no}&is_real_user=1`,
      },
    });
  }

  const geojson = {
    type: "FeatureCollection" as const,
    features,
  };

  const outPath = join(process.cwd(), "public", "data", "dinosaurs.geojson");
  writeFileSync(outPath, JSON.stringify(geojson));

  console.log(`\nWrote ${features.length} features to ${outPath}`);
  console.log("\nGroup breakdown:");
  Object.entries(groupCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([g, c]) => console.log(`  ${g}: ${c}`));
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string>;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
