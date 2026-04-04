"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { supabase } from "@/lib/supabaseClient"

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

if (!mapboxToken) {
  throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is missing")
}

mapboxgl.accessToken = mapboxToken

type LocationRow = {
  id: string
  name: string
  lat: number
  lng: number
  type: string
  line: string | null
  is_public: boolean
  user_id: string | null
}

const LAST_UPDATED_TEXT = "Last updated 04/04/26"

const LINE_CONFIG: Record<string, { label: string; color: string }> = {
  nsl: { label: "NSL", color: "#d32f2f" },
  ewl: { label: "EWL", color: "#2e7d32" },
  ccl: { label: "CCL", color: "#f57c00" },
  dtl: { label: "DTL", color: "#1976d2" },
  nel: { label: "NEL", color: "#8e24aa" },
  tel: { label: "TEL", color: "#6d4c41" },
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color?: string; useImage?: boolean }
> = {
  mrt: { label: "MRT" },
  activesg_gym: { label: "ActiveSG", useImage: true },
  anytime_fitness: { label: "Anytime Fitness", useImage: true },
}

function getMarkerColor(location: LocationRow) {
  if (location.type === "mrt") {
    switch (location.line) {
      case "nsl":
        return "#d32f2f"
      case "ewl":
        return "#2e7d32"
      case "ccl":
        return "#f57c00"
      case "dtl":
        return "#1976d2"
      case "nel":
        return "#8e24aa"
      case "tel":
        return "#6d4c41"
      default:
        return "#757575"
    }
  }

  switch (location.type) {
    case "activesg_gym":
      return "#0097a7"
    case "anytime_fitness":
      return "#111827"
    default:
      return "#757575"
  }
}

function createMarkerElement(location: LocationRow) {
  const el = document.createElement("div")
  el.style.width = "18px"
  el.style.height = "18px"
  el.style.cursor = "pointer"
  el.style.display = "flex"
  el.style.alignItems = "center"
  el.style.justifyContent = "center"

  if (location.type === "activesg_gym") {
    el.style.backgroundImage = "url('/unamed.png')"
    el.style.backgroundSize = "contain"
    el.style.backgroundRepeat = "no-repeat"
    el.style.backgroundPosition = "center"
    return el
  }

  if (location.type === "anytime_fitness") {
    el.style.backgroundImage = "url('/AFLOGO.PNG')"
    el.style.backgroundSize = "contain"
    el.style.backgroundRepeat = "no-repeat"
    el.style.backgroundPosition = "center"
    return el
  }

  el.style.borderRadius = "50%"
  el.style.border = "3px solid white"
  el.style.boxShadow = "0 0 0 1px #999"
  el.style.backgroundColor = getMarkerColor(location)

  return el
}

function LegendIcon({
  color,
  imageUrl,
}: {
  color?: string
  imageUrl?: string
}) {
  if (imageUrl) {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color ?? "#757575",
        display: "inline-block",
        border: "2px solid white",
        boxShadow: "0 0 0 1px #999",
        flexShrink: 0,
      }}
    />
  )
}

function FilterCard({
  checked,
  onChange,
  label,
  color,
  imageUrl,
}: {
  checked: boolean
  onChange: () => void
  label: string
  color?: string
  imageUrl?: string
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px 14px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: checked ? "#f9fafb" : "#ffffff",
        cursor: "pointer",
        minHeight: "72px",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
        />
        <LegendIcon color={color} imageUrl={imageUrl} />
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>

      <span
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          alignSelf: "flex-end",
        }}
      >
        {LAST_UPDATED_TEXT}
      </span>
    </label>
  )
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [locations, setLocations] = useState<LocationRow[]>([])

  const [enabledLines, setEnabledLines] = useState<Record<string, boolean>>({
    nsl: true,
    ewl: true,
    ccl: true,
    dtl: true,
    nel: true,
    tel: true,
  })

  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({
    mrt: true,
    activesg_gym: true,
    anytime_fitness: true,
  })

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [103.8198, 1.3521],
      zoom: 11,
    })

    mapRef.current = map

    map.on("load", async () => {
      const { data, error } = await supabase.from("locations").select("*")

      if (error) {
        console.error("Error loading locations:", error)
        return
      }

      const normalized: LocationRow[] = (data ?? []).map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        lat: Number(item.lat),
        lng: Number(item.lng),
        type: String(item.type),
        line: item.line ? String(item.line) : null,
        is_public: Boolean(item.is_public),
        user_id: item.user_id ? String(item.user_id) : null,
      }))

      setLocations(normalized)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      if (!enabledTypes[location.type]) return false

      if (location.type === "mrt" && location.line && !enabledLines[location.line]) {
        return false
      }

      return true
    })
  }, [locations, enabledLines, enabledTypes])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    filteredLocations.forEach((location) => {
      if (Number.isNaN(location.lat) || Number.isNaN(location.lng)) return

      const el = createMarkerElement(location)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(`
            <div>
              <strong>${location.name}</strong><br/>
              <span>Type: ${location.type}</span><br/>
              <span>Line: ${location.line ?? "-"}</span>
            </div>
          `)
        )
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [filteredLocations])

  const toggleLine = (line: string) => {
    setEnabledLines((prev) => ({ ...prev, [line]: !prev[line] }))
  }

  const toggleType = (type: string) => {
    setEnabledTypes((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div
        style={{
          display: "grid",
          gap: "18px",
          padding: "18px",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "15px" }}>
            MRT Lines
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
            }}
          >
            {Object.entries(LINE_CONFIG).map(([key, config]) => (
              <FilterCard
                key={key}
                checked={enabledLines[key]}
                onChange={() => toggleLine(key)}
                label={config.label}
                color={config.color}
              />
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "15px" }}>
            Location Types
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <FilterCard
              checked={enabledTypes.mrt}
              onChange={() => toggleType("mrt")}
              label="MRT"
              color="#757575"
            />
            <FilterCard
              checked={enabledTypes.activesg_gym}
              onChange={() => toggleType("activesg_gym")}
              label="ActiveSG"
              imageUrl="/unamed.png"
            />
            <FilterCard
              checked={enabledTypes.anytime_fitness}
              onChange={() => toggleType("anytime_fitness")}
              label="Anytime Fitness"
              imageUrl="/AFLOGO.PNG"
            />
          </div>
        </div>
      </div>

      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "80vh",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      />
    </div>
  )
}