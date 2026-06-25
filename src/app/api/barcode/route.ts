import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return Response.json({ error: 'No barcode' }, { status: 400 })

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_quantity,nutriments`,
      { next: { revalidate: 86400 } }
    )
    const data = await res.json()

    if (data.status !== 1 || !data.product) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    const p = data.product
    const n = p.nutriments ?? {}

    const kcalPer100 =
      n['energy-kcal_100g'] ??
      (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)

    const servingSize = parseFloat(p.serving_quantity) || 100
    // Nutriments from OpenFoodFacts are per 100g; scale them to one serving
    // so the returned values mean "per serving (servingSize)".
    const perServing = (per100: number) => Math.round((per100 * servingSize) / 100 * 10) / 10

    return Response.json({
      fdcId: Number(code.replace(/\D/g, '').slice(-9)) || Date.now(),
      description: (p.product_name || 'Unknown Product').trim(),
      brandOwner: p.brands ? p.brands.split(',')[0].trim() : null,
      servingSize,
      servingSizeUnit: 'g',
      calories: perServing(kcalPer100),
      proteinG: perServing(n['proteins_100g'] ?? 0),
      fatG: perServing(n['fat_100g'] ?? 0),
      carbsG: perServing(n['carbohydrates_100g'] ?? 0),
    })
  } catch {
    return Response.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
