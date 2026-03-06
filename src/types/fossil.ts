export interface Fossil {
  id: string;
  name: string;
  commonName: string;
  coords: [number, number]; // [lng, lat]
  period: string;
  majorPeriod: string;
  age: string;
  formation: string;
  location: string;
  group: string;
  taxonomyClass: string;
  taxonomyOrder: string;
  taxonomyFamily: string;
  taxonomyGenus: string;
  taxonomySpecies: string;
  pbdbUrl: string;
}

const MAJOR_PERIODS = [
  { name: "Triassic", from: 252, to: 201 },
  { name: "Jurassic", from: 201, to: 145 },
  { name: "Cretaceous", from: 145, to: 66 },
  { name: "Paleogene", from: 66, to: 23 },
  { name: "Neogene", from: 23, to: 2.6 },
  { name: "Quaternary", from: 2.6, to: 0 },
];

export function getMajorPeriod(maxMa: number): string {
  for (const p of MAJOR_PERIODS) {
    if (maxMa <= p.from && maxMa >= p.to) return p.name;
  }
  // Edge cases: use closest match
  if (maxMa > 252) return "Triassic";
  return "Quaternary";
}
