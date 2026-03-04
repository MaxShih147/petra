export interface Fossil {
  id: string;
  name: string;
  commonName: string;
  coords: [number, number]; // [lng, lat]
  period: string;
  age: string;
  formation: string;
  summary: string;
  silhouette: string; // SVG path data for the dinosaur silhouette
}
