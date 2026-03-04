"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fossils } from "@/data/fossils";
import { Fossil } from "@/types/fossil";
import FossilCard from "./FossilCard";
import ExcavationReport from "./ExcavationReport";
import { createRoot } from "react-dom/client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [terrain, setTerrain] = useState(false);
  const [selectedFossil, setSelectedFossil] = useState<Fossil | null>(null);

  const handleFossilSelect = useCallback((fossil: Fossil) => {
    setSelectedFossil(fossil);
  }, []);

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
      // Sepia-tinted fog for globe atmosphere
      m.setFog({
        color: "rgba(245, 245, 220, 0.8)",
        "high-color": "rgba(210, 180, 140, 0.6)",
        "horizon-blend": 0.05,
        "space-color": "rgba(62, 39, 35, 1)",
        "star-intensity": 0.3,
      });

      // Add raster-dem source for terrain
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
      // Add fossil markers
      addMarkers(m);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addMarkers(m: mapboxgl.Map) {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    fossils.forEach((fossil) => {
      const el = document.createElement("div");
      el.className = "petra-marker";

      const root = createRoot(el);
      root.render(
        <FossilCard fossil={fossil} onClick={() => handleFossilSelect(fossil)} />
      );

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(fossil.coords)
        .addTo(m);

      markersRef.current.push(marker);
    });
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
            {fossils.length}
          </span>
        </span>
      </div>

      {/* Excavation Report Side Panel */}
      <ExcavationReport fossil={selectedFossil} onClose={handleCloseReport} />
    </div>
  );
}
