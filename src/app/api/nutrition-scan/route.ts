import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType } = await request.json()

    if (!image || !mimeType) {
      return Response.json({ error: 'Missing image data' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: image,
            },
          },
          {
            type: 'text',
            text: `Extract nutritional data from this image. The label may be in any language (Dutch, English, etc.).

Dutch terms: Energie=calories, Eiwitten=protein, Vet=fat, Koolhydraten=carbohydrates, Voedingsvezel=fiber.

Return ONLY a valid JSON object (no markdown, no extra text) with:
- foodName: string (product name if visible, otherwise "Scanned Product")
- calories: number (kcal per 100g — if only kJ shown, divide by 4.184)
- proteinG: number (grams protein per 100g)
- fatG: number (grams total fat per 100g)
- carbsG: number (grams carbohydrates per 100g)
- servingSize: number (serving size in grams, default 100 if not shown)

All values must be per 100g. Convert from per serving if needed. If no nutritional data is visible at all, return: {"error": "Could not extract nutritional information"}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse response' }, { status: 422 })
    }

    const data = JSON.parse(jsonMatch[0])
    if (data.error) {
      return Response.json({ error: data.error }, { status: 422 })
    }

    return Response.json({
      fdcId: Date.now(),
      description: data.foodName || 'Scanned Product',
      brandOwner: null,
      servingSize: data.servingSize || 100,
      servingSizeUnit: 'g',
      calories: Math.round((data.calories || 0) * 10) / 10,
      proteinG: Math.round((data.proteinG || 0) * 10) / 10,
      fatG: Math.round((data.fatG || 0) * 10) / 10,
      carbsG: Math.round((data.carbsG || 0) * 10) / 10,
    })
  } catch (e) {
    console.error('Nutrition scan error:', e)
    return Response.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
