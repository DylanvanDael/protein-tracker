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

    return Response.json({
      fdcId: Number(code.replace(/\D/g, '').slice(-9)) || Date.now(),
      description: (p.product_name || 'Unknown Product').trim(),
      brandOwner: p.brands ? p.brands.split(',')[0].trim() : null,
      servingSize,
      servingSizeUnit: 'g',
      calories: Math.round(kcalPer100 * 10) / 10,
      proteinG: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
      fatG: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
      carbsG: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
    })
  } catch {
    return Response.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
