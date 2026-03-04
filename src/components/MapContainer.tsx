"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Fossil } from "@/types/fossil";
import ExcavationReport from "./ExcavationReport";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface CardMarker {
  marker: mapboxgl.Marker;
  id: string;
}

export default function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const cardMarkers = useRef<CardMarker[]>([]);
  const setSelectedFossilRef = useRef<(f: Fossil | null) => void>(() => {});
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [terrain, setTerrain] = useState(false);
  const [selectedFossil, setSelectedFossil] = useState<Fossil | null>(null);
  const [specimenCount, setSpecimenCount] = useState(0);

  // Keep ref in sync so marker callbacks can access latest setter
  setSelectedFossilRef.current = setSelectedFossil;

  const handleCloseReport = useCallback(() => {
    setSelectedFossil(null);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [0, 20],
      zoom: 2,
      projection: "globe",
      antialias: true,
    });

    const m = map.current;

    m.on("style.load", () => {
      m.setFog({
        color: "rgba(245, 245, 220, 0.8)",
        "high-color": "rgba(210, 180, 140, 0.6)",
        "horizon-blend": 0.05,
        "space-color": "rgba(62, 39, 35, 1)",
        "star-intensity": 0.3,
      });

      if (!m.getSource("mapbox-dem")) {
        m.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
    });

    m.on("load", () => {
      fetch("/data/dinosaurs.geojson")
        .then((res) => res.json())
        .then((data) => {
          setSpecimenCount(data.features?.length ?? 0);

          m.addSource("fossils", {
            type: "geojson",
            data,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
          });

          // Cluster circles — sized by point_count
          m.addLayer({
            id: "clusters",
            type: "circle",
            source: "fossils",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#8B5A2B",
              "circle-opacity": 0.85,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#F5F5DC",
              "circle-radius": [
                "step",
                ["get", "point_count"],
                16,
                50, 20,
                200, 26,
                1000, 34,
              ],
            },
          });

          // Cluster count labels
          m.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "fossils",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#F5F5DC",
            },
          });

          // Unclustered point circles (visible at low zoom, hidden when cards take over)
          m.addLayer({
            id: "unclustered-point",
            type: "circle",
            source: "fossils",
            filter: ["!", ["has", "point_count"]],
            maxzoom: 4,
            paint: {
              "circle-color": "#8B5A2B",
              "circle-opacity": 0.85,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#F5F5DC",
              "circle-radius": 16,
            },
          });

          // Unclustered point "1" label
          m.addLayer({
            id: "unclustered-count",
            type: "symbol",
            source: "fossils",
            filter: ["!", ["has", "point_count"]],
            maxzoom: 4,
            layout: {
              "text-field": "1",
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#F5F5DC",
            },
          });

          // Click on cluster → zoom in
          m.on("click", "clusters", (e) => {
            const features = m.queryRenderedFeatures(e.point, {
              layers: ["clusters"],
            });
            if (!features.length) return;
            const clusterId = features[0].properties?.cluster_id;
            const source = m.getSource("fossils") as mapboxgl.GeoJSONSource;
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              const geometry = features[0].geometry;
              if (geometry.type !== "Point") return;
              m.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom!,
              });
            });
          });

          // Click on unclustered circle → zoom to card level
          m.on("click", "unclustered-point", (e) => {
            if (!e.features?.length) return;
            const geometry = e.features[0].geometry;
            if (geometry.type !== "Point") return;
            m.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: 5,
            });
          });

          // Cursor on clusters & unclustered circles
          m.on("mouseenter", "clusters", () => {
            m.getCanvas().style.cursor = "pointer";
          });
          m.on("mouseleave", "clusters", () => {
            m.getCanvas().style.cursor = "";
          });
          m.on("mouseenter", "unclustered-point", () => {
            m.getCanvas().style.cursor = "pointer";
          });
          m.on("mouseleave", "unclustered-point", () => {
            m.getCanvas().style.cursor = "";
          });

          // Update card markers on every render
          m.on("render", () => updateCardMarkers(m));
          updateCardMarkers(m);
        });
    });

    return () => {
      cardMarkers.current.forEach((cm) => cm.marker.remove());
      cardMarkers.current = [];
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCardMarkers(m: mapboxgl.Map) {
    if (!m.getSource("fossils")) return;

    // Only show card markers when zoomed in past the circle layers
    if (m.getZoom() < 4) {
      // Remove all card markers at low zoom
      cardMarkers.current.forEach((cm) => cm.marker.remove());
      cardMarkers.current = [];
      return;
    }

    // Query all visible unclustered features
    const features = m.querySourceFeatures("fossils", {
      filter: ["!", ["has", "point_count"]],
    });

    // Deduplicate by id (querySourceFeatures can return dupes across tiles)
    const seen = new Set<string>();
    const unique: typeof features = [];
    for (const f of features) {
      const id = f.properties?.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        unique.push(f);
      }
    }

    // Build set of currently visible ids
    const visibleIds = new Set(unique.map((f) => f.properties?.id));

    // Remove markers that are no longer visible
    cardMarkers.current = cardMarkers.current.filter((cm) => {
      if (!visibleIds.has(cm.id)) {
        cm.marker.remove();
        return false;
      }
      return true;
    });

    // Build set of existing marker ids
    const existingIds = new Set(cardMarkers.current.map((cm) => cm.id));

    // Add new markers for newly visible features
    for (const f of unique) {
      const props = f.properties!;
      const id = props.id;
      if (existingIds.has(id)) continue;

      const geometry = f.geometry;
      if (geometry.type !== "Point") continue;
      const coords = geometry.coordinates as [number, number];

      const abbr = (props.commonName || props.name || "").slice(0, 2).toUpperCase();

      // Build card marker as plain DOM
      const el = document.createElement("div");
      el.className = "petra-card-marker";
      el.innerHTML = `
        <div class="petra-card-inner">
          <span class="petra-card-abbr">${abbr}</span>
        </div>
        <div class="petra-card-label">${props.name || ""}</div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedFossilRef.current({
          id: props.id,
          name: props.name,
          commonName: props.commonName,
          coords,
          period: props.period,
          age: props.age,
          formation: props.formation,
          location: props.location,
          group: props.group,
          taxonomyClass: props.taxonomyClass,
          taxonomyOrder: props.taxonomyOrder,
          taxonomyFamily: props.taxonomyFamily,
          taxonomyGenus: props.taxonomyGenus,
          taxonomySpecies: props.taxonomySpecies,
          pbdbUrl: props.pbdbUrl,
        });
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(coords)
        .addTo(m);

      cardMarkers.current.push({ marker, id });
    }
  }

  // Handle projection toggle
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => m.setProjection(projection);
    if (m.isStyleLoaded()) apply();
    else m.once("style.load", apply);
  }, [projection]);

  // Handle terrain toggle
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (terrain) {
        m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      } else {
        m.setTerrain(undefined as unknown as mapboxgl.TerrainSpecification);
      }
    };
    if (m.isStyleLoaded()) apply();
    else m.once("style.load", apply);
  }, [terrain]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Control Panel */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        {/* Logo */}
        <div className="bg-petra-parchment/95 backdrop-blur-sm border border-petra-sand rounded-lg px-5 py-3 shadow-card">
          <h1 className="font-display text-2xl font-bold text-petra-sepia tracking-wide">
            PETRA
          </h1>
          <p className="font-body text-xs text-petra-fossil tracking-widest uppercase">
            The Fossil Atlas
          </p>
        </div>

        {/* Projection Toggle */}
        <button
          onClick={() =>
            setProjection((p) => (p === "globe" ? "mercator" : "globe"))
          }
          className="bg-petra-parchment/95 backdrop-blur-sm border border-petra-sand rounded-lg px-4 py-2.5 shadow-card hover:shadow-card-hover transition-all duration-300 text-left group"
        >
          <span className="font-body text-xs text-petra-fossil uppercase tracking-wider block">
            Projection
          </span>
          <span className="font-display text-sm text-petra-sepia group-hover:text-petra-sienna transition-colors">
            {projection === "globe" ? "3D Globe" : "2D Mercator"}
          </span>
        </button>

        {/* Terrain Toggle */}
        <button
          onClick={() => setTerrain((t) => !t)}
          className="bg-petra-parchment/95 backdrop-blur-sm border border-petra-sand rounded-lg px-4 py-2.5 shadow-card hover:shadow-card-hover transition-all duration-300 text-left group"
        >
          <span className="font-body text-xs text-petra-fossil uppercase tracking-wider block">
            Terrain
          </span>
          <span className="font-display text-sm text-petra-sepia group-hover:text-petra-sienna transition-colors">
            {terrain ? "Elevation On" : "Elevation Off"}
          </span>
        </button>
      </div>

      {/* Specimen Count */}
      <div className="absolute bottom-6 left-6 z-10 bg-petra-parchment/95 backdrop-blur-sm border border-petra-sand rounded-lg px-4 py-2.5 shadow-card">
        <span className="font-body text-xs text-petra-fossil uppercase tracking-wider">
          Specimens:{" "}
          <span className="font-display text-petra-sienna font-bold">
            {specimenCount.toLocaleString()}
          </span>
        </span>
      </div>

      {/* PBDB Attribution */}
      <div className="absolute bottom-6 right-6 z-10 bg-petra-parchment/80 backdrop-blur-sm border border-petra-sand rounded px-3 py-1.5">
        <span className="font-body text-[10px] text-petra-fossil">
          Data:{" "}
          <a
            href="https://paleobiodb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-petra-sienna"
          >
            Paleobiology Database
          </a>{" "}
          (CC BY 4.0)
        </span>
      </div>

      {/* Excavation Report Side Panel */}
      <ExcavationReport fossil={selectedFossil} onClose={handleCloseReport} />
    </div>
  );
}
