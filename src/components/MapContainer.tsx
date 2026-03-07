"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Fossil, getMajorPeriod } from "@/types/fossil";
import ExcavationReport from "./ExcavationReport";
import { getSilhouette } from "@/lib/dinoSilhouettes";
import TimeSlider from "./TimeSlider";
import LangSwitch from "./LangSwitch";
import AboutPanel from "./AboutPanel";
import { useI18n } from "@/lib/i18n";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const GROUP_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "theropod", label: "獸腳類", color: "#B44D2E" },
  { key: "sauropod", label: "蜥腳類", color: "#6B8E23" },
  { key: "ceratopsian", label: "角龍類", color: "#8B6914" },
  { key: "hadrosaur", label: "鴨嘴龍", color: "#2E8B57" },
  { key: "ankylosaur", label: "甲龍類", color: "#708090" },
  { key: "stegosaur", label: "劍龍類", color: "#8B4513" },
  { key: "ornithopod", label: "鳥腳類", color: "#CD853F" },
  { key: "pachycephalosaur", label: "厚頭龍", color: "#9370DB" },
  { key: "ornithomimosaur", label: "似鳥龍", color: "#D2691E" },
  { key: "oviraptorosaur", label: "偷蛋龍", color: "#DB7093" },
  { key: "bird", label: "鳥類", color: "#4682B4" },
  { key: "trace", label: "足跡/蛋", color: "#A0522D" },
  { key: "unknown", label: "未分類", color: "#999" },
];

const ALL_GROUPS = new Set(GROUP_CONFIG.map((g) => g.key));
const GROUP_COLOR_MAP: Record<string, string> = Object.fromEntries(
  GROUP_CONFIG.map((g) => [g.key, g.color])
);
// Mapbox match expression for group → color
const GROUP_COLOR_EXPR: mapboxgl.Expression = [
  "match",
  ["get", "group"],
  ...GROUP_CONFIG.flatMap((g) => [g.key, g.color]),
  "#8B5A2B", // fallback
];

type FamilyMap = Record<string, { name: string; count: number }[]>;

function resolveFamily(props: Record<string, string>): string {
  const fam = props.taxonomyFamily;
  if (fam && fam !== "NO_FAMILY_SPECIFIED" && fam !== "Unknown" && fam !== "")
    return fam;
  const ord = props.taxonomyOrder;
  if (ord && ord !== "NO_ORDER_SPECIFIED" && ord !== "Unknown" && ord !== "")
    return ord;
  return "Other";
}

function buildFamilyMap(features: GeoJSON.Feature[]): FamilyMap {
  const map: Record<string, Record<string, number>> = {};
  for (const f of features) {
    const props = f.properties as Record<string, string>;
    const group = props.group;
    const family = resolveFamily(props);
    if (!map[group]) map[group] = {};
    map[group][family] = (map[group][family] || 0) + 1;
  }
  const result: FamilyMap = {};
  for (const [group, families] of Object.entries(map)) {
    result[group] = Object.entries(families)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  return result;
}

interface TrackedMarker {
  marker: mapboxgl.Marker;
  id: string;
}

function createPieSvg(props: Record<string, unknown>, size: number): string {
  const counts: { color: string; count: number }[] = [];
  for (const g of GROUP_CONFIG) {
    const c = (props[`c_${g.key}`] as number) || 0;
    if (c > 0) counts.push({ color: g.color, count: c });
  }
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total === 0) return "";

  const r = size / 2;
  let cumulative = 0;
  const paths: string[] = [];

  if (counts.length === 1) {
    paths.push(`<circle cx="${r}" cy="${r}" r="${r}" fill="${counts[0].color}" opacity="0.85"/>`);
  } else {
    for (const seg of counts) {
      const start = cumulative / total;
      const end = (cumulative + seg.count) / total;
      cumulative += seg.count;

      const startAngle = start * 2 * Math.PI - Math.PI / 2;
      const endAngle = end * 2 * Math.PI - Math.PI / 2;
      const largeArc = seg.count / total > 0.5 ? 1 : 0;

      const x1 = r + r * Math.cos(startAngle);
      const y1 = r + r * Math.sin(startAngle);
      const x2 = r + r * Math.cos(endAngle);
      const y2 = r + r * Math.sin(endAngle);

      paths.push(
        `<path d="M${r},${r} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${seg.color}" opacity="0.85"/>`
      );
    }
  }

  const pointCount = props.point_count_abbreviated || props.point_count || total;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${paths.join("")}
    <circle cx="${r}" cy="${r}" r="${r}" fill="none" stroke="#F5F5DC" stroke-width="2"/>
    <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central" fill="#F5F5DC" font-family="Inter,system-ui,sans-serif" font-size="${size > 50 ? 13 : 11}" font-weight="600">${pointCount}</text>
  </svg>`;
}

export default function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const cardMarkers = useRef<TrackedMarker[]>([]);
  const clusterMarkers = useRef<TrackedMarker[]>([]);
  const fullData = useRef<GeoJSON.FeatureCollection | null>(null);
  const setSelectedFossilRef = useRef<(f: Fossil | null) => void>(() => {});
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [terrain, setTerrain] = useState(false);
  const [selectedFossil, setSelectedFossil] = useState<Fossil | null>(null);
  const [specimenCount, setSpecimenCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set(ALL_GROUPS));
  const [excludedFamilies, setExcludedFamilies] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [familyMap, setFamilyMap] = useState<FamilyMap>({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"explore" | "about">("explore");
  const { t, tDino, tFamily } = useI18n();
  const [timeMax, setTimeMax] = useState(252);
  const [timeMin, setTimeMin] = useState(0);

  const handleTimeChange = useCallback((max: number, min: number) => {
    setTimeMax(max);
    setTimeMin(min);
  }, []);

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
      fetch("/data/dinosaurs.geojson.gz")
        .then((res) => {
          const ds = new DecompressionStream("gzip");
          const decompressed = res.body!.pipeThrough(ds);
          return new Response(decompressed).json();
        })
        .then((data) => {
          fullData.current = data;
          const total = data.features?.length ?? 0;
          setTotalCount(total);
          setSpecimenCount(total);
          setFamilyMap(buildFamilyMap(data.features));
          const counts: Record<string, number> = {};
          for (const f of data.features) {
            const g = (f.properties as Record<string, string>).group;
            counts[g] = (counts[g] || 0) + 1;
          }
          setGroupCounts(counts);

          // Build clusterProperties to count each group
          const clusterProps: Record<string, mapboxgl.Expression> = {};
          for (const g of GROUP_CONFIG) {
            clusterProps[`c_${g.key}`] = [
              "+",
              ["case", ["==", ["get", "group"], g.key], 1, 0],
            ];
          }

          m.addSource("fossils", {
            type: "geojson",
            data,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
            clusterProperties: clusterProps,
          });

          // Hidden cluster layer (needed for querySourceFeatures to work)
          m.addLayer({
            id: "clusters",
            type: "circle",
            source: "fossils",
            filter: ["has", "point_count"],
            paint: {
              "circle-radius": 0,
              "circle-opacity": 0,
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
              "circle-color": GROUP_COLOR_EXPR,
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

          // Cursor on unclustered circles
          m.on("mouseenter", "unclustered-point", () => {
            m.getCanvas().style.cursor = "pointer";
          });
          m.on("mouseleave", "unclustered-point", () => {
            m.getCanvas().style.cursor = "";
          });

          // Update markers on every render
          m.on("render", () => {
            updateClusterMarkers(m);
            updateCardMarkers(m);
          });
          updateClusterMarkers(m);
          updateCardMarkers(m);
        });
    });

    return () => {
      clusterMarkers.current.forEach((cm) => cm.marker.remove());
      clusterMarkers.current = [];
      cardMarkers.current.forEach((cm) => cm.marker.remove());
      cardMarkers.current = [];
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateClusterMarkers(m: mapboxgl.Map) {
    if (!m.getSource("fossils")) return;

    const features = m.querySourceFeatures("fossils", {
      filter: ["has", "point_count"],
    });

    // Deduplicate by cluster_id
    const seen = new Set<number>();
    const unique: typeof features = [];
    for (const f of features) {
      const cid = f.properties?.cluster_id as number;
      if (cid !== undefined && !seen.has(cid)) {
        seen.add(cid);
        unique.push(f);
      }
    }

    const visibleIds = new Set(unique.map((f) => String(f.properties?.cluster_id)));

    // Remove markers no longer visible
    clusterMarkers.current = clusterMarkers.current.filter((cm) => {
      if (!visibleIds.has(cm.id)) {
        cm.marker.remove();
        return false;
      }
      return true;
    });

    const existingIds = new Set(clusterMarkers.current.map((cm) => cm.id));

    for (const f of unique) {
      const props = f.properties!;
      const cid = String(props.cluster_id);
      if (existingIds.has(cid)) continue;

      const geometry = f.geometry;
      if (geometry.type !== "Point") continue;
      const coords = geometry.coordinates as [number, number];

      const pointCount = props.point_count as number;
      const size = pointCount < 50 ? 36 : pointCount < 200 ? 44 : pointCount < 1000 ? 54 : 68;

      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = createPieSvg(props, size);

      el.addEventListener("click", () => {
        const source = m.getSource("fossils") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(props.cluster_id as number, (err, zoom) => {
          if (err) return;
          m.easeTo({ center: coords, zoom: zoom! });
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(coords)
        .addTo(m);

      clusterMarkers.current.push({ marker, id: cid });
    }
  }

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
      const groupColor = GROUP_COLOR_MAP[props.group] || "#8B5A2B";
      const silhouetteUrl = getSilhouette(props.group);

      // Build card marker as plain DOM
      const el = document.createElement("div");
      el.className = "petra-card-marker";
      el.innerHTML = `
        <div class="petra-card-inner" style="border-color: ${groupColor};">
          <div class="petra-card-silhouette${props.group === "trace" || props.group === "unknown" ? "" : " petra-card-silhouette-lg"}" style="background-color: ${groupColor}; -webkit-mask-image: url(${silhouetteUrl}); mask-image: url(${silhouetteUrl});" aria-hidden="true"></div>
          <span class="petra-card-abbr" style="color: ${groupColor};">${abbr}</span>
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
          majorPeriod: getMajorPeriod(parseFloat(props.max_ma || "0")),
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

  // Handle group + family filter
  useEffect(() => {
    const m = map.current;
    const data = fullData.current;
    if (!m || !data) return;
    const source = m.getSource("fossils") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    clusterMarkers.current.forEach((cm) => cm.marker.remove());
    clusterMarkers.current = [];
    cardMarkers.current.forEach((cm) => cm.marker.remove());
    cardMarkers.current = [];

    const noGroupFilter = activeGroups.size === ALL_GROUPS.size;
    const noFamilyFilter = excludedFamilies.size === 0;
    const noTimeFilter = timeMax >= 252 && timeMin <= 0;

    if (noGroupFilter && noFamilyFilter && noTimeFilter) {
      source.setData(data);
      setSpecimenCount(data.features?.length ?? 0);
    } else {
      const filtered: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: data.features.filter((f) => {
          const props = f.properties as Record<string, string>;
          if (!activeGroups.has(props.group)) return false;
          if (excludedFamilies.size > 0) {
            const family = resolveFamily(props);
            const key = `${props.group}::${family}`;
            if (excludedFamilies.has(key)) return false;
          }
          if (!noTimeFilter) {
            const fMax = parseFloat(props.max_ma);
            const fMin = parseFloat(props.min_ma);
            // Include if the fossil's time range overlaps with selected range
            if (fMin > timeMax || fMax < timeMin) return false;
          }
          return true;
        }),
      };
      source.setData(filtered);
      setSpecimenCount(filtered.features.length);
    }
  }, [activeGroups, excludedFamilies, timeMax, timeMin]);

  const toggleGroup = useCallback((group: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
    // Clear excluded families for this group when toggling
    setExcludedFamilies((prev) => {
      const next = new Set(prev);
      for (const key of prev) {
        if (key.startsWith(group + "::")) next.delete(key);
      }
      return next.size === prev.size ? prev : next;
    });
  }, []);

  const toggleFamily = useCallback((group: string, family: string) => {
    const key = `${group}::${family}`;
    setExcludedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // If all families in this group are now excluded, turn off the group
      const families = familyMap[group] || [];
      const allExcluded = families.every((f) => next.has(`${group}::${f.name}`));
      if (allExcluded) {
        setActiveGroups((prev) => {
          const g = new Set(prev);
          g.delete(group);
          return g;
        });
        // Clear the excluded families for this group since group is off
        for (const f of families) {
          next.delete(`${group}::${f.name}`);
        }
      }
      return next;
    });
  }, [familyMap]);

  const selectAllGroups = useCallback(() => {
    setActiveGroups(new Set(ALL_GROUPS));
    setExcludedFamilies(new Set());
  }, []);
  const clearAllGroups = useCallback(() => setActiveGroups(new Set()), []);

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
        m.setTerrain({ source: "mapbox-dem", exaggeration: 3 });
      } else {
        m.setTerrain(undefined as unknown as mapboxgl.TerrainSpecification);
      }
    };
    if (m.isStyleLoaded()) apply();
    else m.once("style.load", apply);
  }, [terrain]);

  const filterContent = (
    <>
      {/* Time Slider */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <span className="font-body text-[10px] text-petra-fossil uppercase tracking-[0.15em] block mb-2">
          {t("time.slider")}
        </span>
        <TimeSlider rangeMax={timeMax} rangeMin={timeMin} onChange={handleTimeChange} />
      </div>

      <div className="h-px bg-petra-sand/40 mx-4" />

      {/* Filter Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center gap-1.5"
        >
          <svg
            viewBox="0 0 20 20"
            className={`w-3 h-3 text-petra-fossil/50 transition-transform duration-200 ${filterOpen ? "rotate-90" : ""}`}
            fill="currentColor"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          <span className="font-body text-[10px] text-petra-fossil uppercase tracking-[0.15em]">
            {t("panel.filterByGroup")}
          </span>
        </button>
        {filterOpen && (
          <div className="flex gap-1.5">
            <button
              onClick={selectAllGroups}
              className="font-body text-[9px] text-petra-sienna hover:text-petra-sepia transition-colors uppercase tracking-wider px-1"
            >
              {t("panel.filterAll")}
            </button>
            <button
              onClick={clearAllGroups}
              className="font-body text-[9px] text-petra-sienna hover:text-petra-sepia transition-colors uppercase tracking-wider px-1"
            >
              {t("panel.filterNone")}
            </button>
          </div>
        )}
      </div>

      {/* Group List */}
      {filterOpen && (
        <div className="overflow-y-auto flex-1 min-h-0 pb-2">
          {GROUP_CONFIG.map((g) => {
            const active = activeGroups.has(g.key);
            const count = groupCounts[g.key] || 0;
            const isExpanded = expandedGroup === g.key;
            const families = familyMap[g.key] || [];
            const hasFamilies = families.length > 1;

            return (
              <div key={g.key} className="px-3">
                {/* Group card row */}
                <div className="py-[3px]">
                  <button
                    onClick={() => toggleGroup(g.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 transition-all duration-150 ${
                      active
                        ? "bg-white shadow-sm"
                        : "bg-petra-bone/20 border-petra-sand/30 opacity-75 saturate-0"
                    }`}
                    style={active ? { borderColor: g.color } : {}}
                  >
                    <img
                      src={getSilhouette(g.key)}
                      alt=""
                      className={`shrink-0 ${g.key === "trace" || g.key === "unknown" ? "w-5 h-5" : "w-6 h-6"}`}
                      style={{ filter: active ? `brightness(0) saturate(100%) opacity(0.7)` : undefined }}
                    />
                    <span className="font-body text-[12px] text-petra-sepia">{t(`group.${g.key}`)}</span>
                    <span className="font-body text-[10px] text-petra-fossil/40 ml-auto">
                      {count.toLocaleString()}
                    </span>
                    {hasFamilies && (
                      <svg
                        viewBox="0 0 16 16"
                        className={`shrink-0 w-3 h-3 text-petra-fossil/40 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        fill="currentColor"
                        onClick={(e) => { e.stopPropagation(); setExpandedGroup(isExpanded ? null : g.key); }}
                      >
                        <path d="M6 3l5 5-5 5V3z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Sub-family cards */}
                {isExpanded && (
                  <div className="ml-5 border-l-2 border-petra-sand/30 pl-2 py-1 mb-1">
                    {families.map((fam) => {
                      const familyKey = `${g.key}::${fam.name}`;
                      const familyActive = active && !excludedFamilies.has(familyKey);
                      return (
                        <button
                          key={fam.name}
                          onClick={() => {
                            if (!active) {
                              setActiveGroups((prev) => new Set([...prev, g.key]));
                              setExcludedFamilies((prev) => {
                                const next = new Set(prev);
                                for (const f of families) {
                                  const key = `${g.key}::${f.name}`;
                                  if (f.name === fam.name) {
                                    next.delete(key);
                                  } else {
                                    next.add(key);
                                  }
                                }
                                return next;
                              });
                            } else {
                              toggleFamily(g.key, fam.name);
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 my-[2px] rounded-md border transition-all duration-150 ${
                            familyActive
                              ? "bg-white border-petra-sand shadow-sm"
                              : "bg-transparent border-petra-sand/20 opacity-75"
                          }`}
                        >
                          <span
                            className="shrink-0 w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: familyActive ? g.color : "#D2B48C" }}
                          />
                          <span className="font-body text-[11px] text-petra-sepia truncate">
                            {tFamily(fam.name)}
                          </span>
                          <span className="font-body text-[9px] text-petra-fossil/40 ml-auto shrink-0">
                            {fam.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* === Desktop Control Panel (md+) === */}
      <div className="hidden md:flex absolute top-6 left-6 z-10 bg-petra-parchment/95 backdrop-blur-sm border border-petra-sand rounded-xl shadow-card overflow-hidden w-[250px] max-h-[calc(100vh-120px)] flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <h1 className="font-display text-xl font-bold text-petra-sepia tracking-wide leading-none">
            {t("panel.title")}
          </h1>
          <p className="font-body text-[9px] text-petra-fossil tracking-[0.2em] uppercase mt-0.5">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Tab Bar */}
        <div className="px-3 pb-1 shrink-0 flex gap-1">
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md font-body text-[11px] transition-colors ${
              activeTab === "explore"
                ? "bg-petra-bone text-petra-sepia font-medium shadow-sm"
                : "text-petra-fossil/60 hover:text-petra-fossil hover:bg-petra-bone/40"
            }`}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z" />
            </svg>
            {t("panel.tab.explore")}
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md font-body text-[11px] transition-colors ${
              activeTab === "about"
                ? "bg-petra-bone text-petra-sepia font-medium shadow-sm"
                : "text-petra-fossil/60 hover:text-petra-fossil hover:bg-petra-bone/40"
            }`}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM6.5 7h3v5h-3V7z" />
            </svg>
            {t("panel.tab.about")}
          </button>
        </div>

        <div className="h-px bg-petra-sand/40 shrink-0" />

        {/* Tab Content */}
        {activeTab === "explore" ? (
          <>
            {/* Specimen count + projection toggle bar */}
            <div className="px-4 py-2 bg-petra-bone/40 border-b border-petra-sand/40 shrink-0 flex items-center justify-between">
              <span className="font-body text-[11px] text-petra-fossil">
                {t("panel.showing")}{" "}
                <span className="font-display font-bold text-petra-sienna">
                  {specimenCount.toLocaleString()}
                </span>
                {(activeGroups.size < ALL_GROUPS.size || excludedFamilies.size > 0) && (
                  <span className="text-petra-fossil/60"> / {totalCount.toLocaleString()}</span>
                )}
                {" "}{t("panel.specimens")}
              </span>
              <button
                onClick={() =>
                  setProjection((p) => (p === "globe" ? "mercator" : "globe"))
                }
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-petra-bone/60 transition-colors"
                title={`Switch to ${projection === "globe" ? "2D Mercator" : "3D Globe"}`}
              >
                {projection === "globe" ? (
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-petra-fossil" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="10" r="7.5" />
                    <ellipse cx="10" cy="10" rx="3" ry="7.5" />
                    <path d="M3 7.5h14M3 12.5h14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-petra-fossil" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2.5" y="4" width="15" height="12" rx="1" />
                    <path d="M10 4v12M2.5 10h15" />
                  </svg>
                )}
                <span className="font-body text-[10px] text-petra-fossil">
                  {projection === "globe" ? "Globe" : "Flat"}
                </span>
              </button>
            </div>

            {filterContent}
          </>
        ) : (
          <AboutPanel />
        )}

        {/* Footer — Lang switch only */}
        <div className="shrink-0 border-t border-petra-sand/40 px-3 py-2 flex items-center justify-center bg-petra-bone/30">
          <LangSwitch />
        </div>
      </div>

      {/* === Mobile Top Bar (< md) === */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-10 safe-top">
        <div className="flex items-center justify-between px-4 py-3 bg-petra-parchment/95 backdrop-blur-sm border-b border-petra-sand">
          {/* Logo */}
          <div>
            <h1 className="font-display text-lg font-bold text-petra-sepia tracking-wide leading-none">
              {t("panel.title")}
            </h1>
            <p className="font-body text-[8px] text-petra-fossil tracking-[0.2em] uppercase">
              {t("app.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LangSwitch />

            {/* Projection toggle */}
            <button
              onClick={() =>
                setProjection((p) => (p === "globe" ? "mercator" : "globe"))
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-petra-bone/60"
            >
              {projection === "globe" ? (
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-petra-fossil" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="7.5" />
                  <ellipse cx="10" cy="10" rx="3" ry="7.5" />
                  <path d="M3 7.5h14M3 12.5h14" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-petra-fossil" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2.5" y="4" width="15" height="12" rx="1" />
                  <path d="M10 4v12M2.5 10h15" />
                </svg>
              )}
            </button>

            {/* Filter toggle */}
            <button
              onClick={() => { setActiveTab("explore"); setMobileFilterOpen((o) => !o); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-petra-bone/60 relative"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-petra-fossil" fill="currentColor">
                <path d="M2 4.5A.5.5 0 012.5 4h15a.5.5 0 010 1h-15A.5.5 0 012 4.5zm2 4A.5.5 0 014.5 8h11a.5.5 0 010 1h-11A.5.5 0 014 8.5zm3 4a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z" />
              </svg>
              {(activeGroups.size < ALL_GROUPS.size || excludedFamilies.size > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-petra-sienna" />
              )}
            </button>

            {/* About toggle */}
            <button
              onClick={() => { setActiveTab("about"); setMobileFilterOpen((o) => !o); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-petra-bone/60"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 text-petra-fossil" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM6.5 7h3v5h-3V7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* === Mobile Bottom Sheet (< md) === */}
      {mobileFilterOpen && (
        <>
          <div
            className="md:hidden absolute inset-0 z-20 bg-petra-sepia/20 backdrop-blur-[2px]"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-30 bg-petra-parchment/90 backdrop-blur-lg border-t border-petra-sand rounded-t-2xl shadow-report max-h-[70vh] flex flex-col safe-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-petra-sand" />
            </div>

            {activeTab === "explore" ? (
              <>
                {/* Specimen count bar */}
                <div className="px-4 py-2 border-y border-petra-sand/40 shrink-0">
                  <span className="font-body text-[11px] text-petra-fossil">
                    {t("panel.showing")}{" "}
                    <span className="font-display font-bold text-petra-sienna">
                      {specimenCount.toLocaleString()}
                    </span>
                    {(activeGroups.size < ALL_GROUPS.size || excludedFamilies.size > 0) && (
                      <span className="text-petra-fossil/60"> / {totalCount.toLocaleString()}</span>
                    )}
                    {" "}{t("panel.specimens")}
                  </span>
                </div>
                {filterContent}
              </>
            ) : (
              <AboutPanel />
            )}
          </div>
        </>
      )}

      {/* PBDB Attribution */}
      <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 z-10 bg-petra-parchment/80 backdrop-blur-sm border border-petra-sand rounded px-2 py-1 md:px-3 md:py-1.5">
        <span className="font-body text-[9px] md:text-[10px] text-petra-fossil">
          {t("panel.data")}{" "}
          <a
            href="https://paleobiodb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-petra-sienna"
          >
            PBDB
          </a>{" "}
          <span className="hidden md:inline">(CC BY 4.0)</span>
        </span>
      </div>

      {/* Excavation Report Side Panel */}
      <ExcavationReport fossil={selectedFossil} onClose={handleCloseReport} />
    </div>
  );
}
