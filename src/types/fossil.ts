export interface Fossil {
  id: string;
  name: string;
  commonName: string;
  coords: [number, number]; // [lng, lat]
  period: string;
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
