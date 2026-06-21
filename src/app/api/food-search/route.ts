import { NextRequest } from 'next/server'

const USDA_API_KEY = process.env.USDA_API_KEY

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return Response.json([])
  }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&dataType=SR%20Legacy,Survey%20(FNDDS),Branded&api_key=${USDA_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()

    const foods = (data.foods ?? []).map((f: USDAFood) => {
      const nutrients = f.foodNutrients ?? []
      const get = (name: string) =>
        nutrients.find((n: Nutrient) => n.nutrientName?.toLowerCase().includes(name))?.value ?? 0

      return {
        fdcId: f.fdcId,
        description: f.description,
        brandOwner: f.brandOwner ?? null,
        servingSize: f.servingSize ?? 100,
        servingSizeUnit: f.servingSizeUnit ?? 'g',
        calories: get('energy'),
        proteinG: get('protein'),
        fatG: get('total lipid'),
        carbsG: get('carbohydrate'),
      }
    })

    return Response.json(foods)
  } catch {
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}

interface Nutrient {
  nutrientName: string
  value: number
}

interface USDAFood {
  fdcId: number
  description: string
  brandOwner?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients: Nutrient[]
}
