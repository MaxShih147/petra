# PETRA — The Fossil Atlas

An interactive 3D globe that visualizes ~24,000 dinosaur fossil discoveries worldwide, powered by real data from the [Paleobiology Database](https://paleobiodb.org/).

![Globe Overview](docs/screenshots/globe-overview.png)

## Features

**3D Globe with Clustering** — Fossils are grouped into clusters at low zoom levels, showing specimen counts across continents. Zoom in to explore individual discoveries.

![Fossil Cards](docs/screenshots/fossil-cards.png)

**Excavation Reports** — Click any fossil to open a detailed side panel with taxonomy, geological period, formation, location, and a direct link to the PBDB record.

![Excavation Report](docs/screenshots/excavation-report.png)

**Additional Controls**
- Toggle between 3D Globe and 2D Mercator projections
- Toggle terrain elevation visualization
- Color-coded geological period badges (Maastrichtian, Albian, Kimmeridgian, etc.)
- Parchment-themed archaeological aesthetic

## Tech Stack

- **Next.js 15** / React 19
- **Mapbox GL** — 3D globe, clustering, terrain
- **Framer Motion** — slide-in panels, transitions
- **Tailwind CSS** — custom Petra color palette (parchment, sepia, sienna, sand, bone)

## Getting Started

```bash
# Install dependencies
npm install

# Set up your Mapbox token
cp .env.local.example .env.local
# Edit .env.local and add your token

# Start dev server
npm run dev
```

## Data

Fossil data is sourced from the [Paleobiology Database](https://paleobiodb.org/) (CC BY 4.0). The dataset includes all Dinosauria occurrences with coordinates, stratigraphy, and taxonomy, classified into groups: theropods, sauropods, ceratopsians, hadrosaurs, ankylosaurs, stegosaurs, ornithopods, and more.

To refresh the data:

```bash
npm run fetch-data
```

## License

Fossil data: [Paleobiology Database](https://paleobiodb.org/) (CC BY 4.0)
