import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) return Response.json([])

  try {
    const products = await searchOpenFoodFacts(query)
    const foods = products
      .filter((p: OFFProduct) => p.product_name && p.nutriments)
      .map(mapProduct)
    return Response.json(foods)
  } catch {
    // Signal a transient failure so the client can retry / show an error,
    // rather than silently rendering it as "no results".
    return Response.json({ error: 'Search failed' }, { status: 502 })
  }
}

function mapProduct(p: OFFProduct) {
  const n = p.nutriments
  const energyKj = n['energy-kj_100g'] ?? n['energy_100g']
  const kcalPer100 =
    n['energy-kcal_100g'] ??
    (energyKj ? Math.round(energyKj / 4.184) : 0)
  const servingSize = parseFloat(String(p.serving_quantity)) || 100
  // Nutriments from OpenFoodFacts are per 100g; scale them to one serving
  // so the returned values mean "per serving (servingSize)".
  const perServing = (per100: number) => Math.round((per100 * servingSize) / 100 * 10) / 10

  return {
    fdcId: p.code ? Number(p.code.slice(-9)) : Date.now(),
    description: p.product_name.trim(),
    brandOwner: brandName(p.brands),
    servingSize,
    servingSizeUnit: 'g',
    calories: perServing(kcalPer100),
    proteinG: perServing(n['proteins_100g'] ?? 0),
    fatG: perServing(n['fat_100g'] ?? 0),
    carbsG: perServing(n['carbohydrates_100g'] ?? 0),
  }
}

// Two independent OpenFoodFacts search services back this. search-a-licious is
// fast but has been flaky; when it errors or returns nothing, fall back to the
// legacy CGI endpoint so one service being down doesn't take search offline.
// Only a total failure of *both* surfaces as a 502.
async function searchOpenFoodFacts(query: string): Promise<OFFProduct[]> {
  let primaryError: unknown
  try {
    const hits = await fetchSearchalicious(query)
    if (hits.length > 0) return hits
  } catch (e) {
    primaryError = e
  }

  try {
    return await fetchLegacy(query)
  } catch (e) {
    // If the primary threw too, surface a failure; if the primary merely
    // returned no results, an empty list from the fallback is a real "no
    // results" and shouldn't read as an outage.
    if (primaryError) throw e
    return []
  }
}

// search.openfoodfacts.org — the current search API. Returns `{ hits: [...] }`.
async function fetchSearchalicious(query: string): Promise<OFFProduct[]> {
  const params = new URLSearchParams({
    q: query,
    langs: 'nl,en',
    page_size: '10',
    fields: 'product_name,brands,serving_quantity,nutriments,code',
  })
  const data = await fetchJson<{ hits?: OFFProduct[] }>(
    `https://search.openfoodfacts.org/search?${params}`,
  )
  return data.hits ?? []
}

// world.openfoodfacts.org/cgi/search.pl — the legacy endpoint. Slower but
// independent of search-a-licious. Returns `{ products: [...] }`.
async function fetchLegacy(query: string): Promise<OFFProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    fields: 'product_name,brands,serving_quantity,nutriments,code',
  })
  const data = await fetchJson<{ products?: OFFProduct[] }>(
    `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
  )
  return data.products ?? []
}

// Bounded fetch with a single retry, so one flaky response doesn't fail the
// whole request.
async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'protein-tracker/1.0 (+https://github.com)' },
        next: { revalidate: 3600 },
      })
      if (!res.ok) throw new Error(`upstream ${res.status}`)
      return await res.json()
    } catch (e) {
      lastError = e
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError
}

// `brands` comes back as a string array (e.g. ["Calve"]) from the new API and
// as a comma-separated string from the legacy one.
function brandName(brands: OFFProduct['brands']): string | null {
  if (Array.isArray(brands)) return brands[0]?.trim() || null
  if (typeof brands === 'string') return brands.split(',')[0].trim() || null
  return null
}

interface OFFNutriments {
  'energy-kcal_100g'?: number
  'energy-kj_100g'?: number
  'energy_100g'?: number
  'proteins_100g'?: number
  'fat_100g'?: number
  'carbohydrates_100g'?: number
}

interface OFFProduct {
  code?: string
  product_name: string
  brands?: string[] | string
  serving_quantity?: string | number
  nutriments: OFFNutriments
}
