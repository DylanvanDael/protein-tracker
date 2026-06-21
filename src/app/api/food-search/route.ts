import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) return Response.json([])

  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '10',
      lc: 'nl',
      fields: 'product_name,brands,serving_quantity,nutriments,code',
    })

    const res = await fetch(
      `https://nl.openfoodfacts.org/cgi/search.pl?${params}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    const foods = (data.products ?? [])
      .filter((p: OFFProduct) => p.product_name && p.nutriments)
      .map((p: OFFProduct) => {
        const n = p.nutriments
        const kcalPer100 =
          n['energy-kcal_100g'] ??
          (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)
        const servingSize = parseFloat(String(p.serving_quantity)) || 100

        return {
          fdcId: p.code ? Number(p.code.slice(-9)) : Date.now(),
          description: p.product_name.trim(),
          brandOwner: p.brands ? p.brands.split(',')[0].trim() : null,
          servingSize,
          servingSizeUnit: 'g',
          calories: Math.round(kcalPer100 * 10) / 10,
          proteinG: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
          fatG: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
          carbsG: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        }
      })

    return Response.json(foods)
  } catch {
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}

interface OFFNutriments {
  'energy-kcal_100g'?: number
  'energy_100g'?: number
  'proteins_100g'?: number
  'fat_100g'?: number
  'carbohydrates_100g'?: number
}

interface OFFProduct {
  code?: string
  product_name: string
  brands?: string
  serving_quantity?: string | number
  nutriments: OFFNutriments
}
