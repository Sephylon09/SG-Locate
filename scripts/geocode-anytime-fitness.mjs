import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

if (!supabaseUrl || !supabaseAnonKey || !mapboxToken) {
  throw new Error("Missing env vars. Need SUPABASE URL, SUPABASE KEY, and MAPBOX TOKEN.")
}

console.log("Using Supabase URL:", supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function geocodeAddress(address) {
  const query = encodeURIComponent(`${address}, Singapore`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${mapboxToken}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Mapbox geocoding failed: ${res.status}`)
  }

  const json = await res.json()
  const feature = json.features?.[0]

  if (!feature || !feature.center) {
    return null
  }

  const [lng, lat] = feature.center
  return { lat, lng }
}

async function main() {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, address, lat, lng")
    .eq("type", "anytime_fitness")

  if (error) {
    console.error("Failed to load AF rows:", error)
    process.exit(1)
  }

  console.log(`Found ${data.length} Anytime Fitness rows`)

  for (const row of data) {
    if (!row.address) {
      console.log(`Skipping ${row.name} - no address`)
      continue
    }

    try {
      const result = await geocodeAddress(row.address)

      if (!result) {
        console.log(`No geocode result for ${row.name}`)
        continue
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from("locations")
        .update({
          lat: result.lat,
          lng: result.lng,
        })
        .eq("id", row.id)
        .select("id, name, lat, lng")

      if (updateError) {
        console.log(`Failed updating ${row.name}:`, updateError.message)
        continue
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.log(`No rows updated for ${row.name} (likely RLS or wrong project/row match)`)
        continue
      }

      console.log(`Updated ${row.name}: ${result.lat}, ${result.lng}`)
    } catch (err) {
      console.log(`Error geocoding ${row.name}:`, err.message)
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  console.log("Done.")
}

main()