"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { supabase } from "@/lib/supabaseClient"

// ✅ Safe env handling (prevents Vercel crash)
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

if (!mapboxToken) {
  throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is missing")
}

mapboxgl.accessToken = mapboxToken

// ✅ Strong typing
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

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [103.8198, 1.3521], // Singapore
      zoom: 11,
    })

    mapRef.current = map

    const loadLocations = async () => {
      const { data, error } = await supabase.from("locations").select("*")

      console.log("DATA:", data)
      console.log("ERROR:", error)

      if (error) {
        console.error("Error loading locations:", error)
        return
      }

      // ✅ Normalize data (important for Vercel TypeScript)
      const locations: LocationRow[] = (data ?? []).map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        lat: Number(item.lat),
        lng: Number(item.lng),
        type: String(item.type),
        line: item.line ? String(item.line) : null,
        is_public: Boolean(item.is_public),
        user_id: item.user_id ? String(item.user_id) : null,
      }))

      locations.forEach((location) => {
        // ❌ Skip invalid coords (prevents crash)
        if (Number.isNaN(location.lat) || Number.isNaN(location.lng)) {
          console.log("Skipping invalid:", location)
          return
        }

        const el = document.createElement("div")

        // 🎨 Base marker style
        el.style.width = "18px"
        el.style.height = "18px"
        el.style.borderRadius = "50%"
        el.style.border = "3px solid white"
        el.style.boxShadow = "0 0 0 1px #999"
        el.style.cursor = "pointer"

        // 🎨 Color logic
        if (location.type === "mrt") {
          if (location.line === "nsl") {
            el.style.backgroundColor = "#d32f2f" // red
          } else if (location.line === "ewl") {
            el.style.backgroundColor = "#2e7d32" // green
          } else if (location.line === "ccl") {
            el.style.backgroundColor = "#f57c00" // orange
          } else {
            el.style.backgroundColor = "#757575"
          }
        } else if (location.type === "gym") {
          el.style.backgroundColor = "#1976d2"
        } else if (location.type === "friend_home") {
          el.style.backgroundColor = "#8e24aa"
        } else {
          el.style.backgroundColor = "#757575"
        }

        // 📍 Create marker
        new mapboxgl.Marker(el)
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
      })
    }

    // ✅ Proper async handling
    map.on("load", () => {
      void loadLocations()
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "80vh",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  )
}