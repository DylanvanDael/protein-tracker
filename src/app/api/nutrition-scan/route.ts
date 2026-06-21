import { NextRequest } from 'next/server'
import { createWorker, PSM } from 'tesseract.js'

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType } = await request.json()
    if (!image || !mimeType) {
      return Response.json({ error: 'Missing image data' }, { status: 400 })
    }

    const buf = Buffer.from(image, 'base64')

    // Run OCR with three PSM modes — two-column nutrition tables need sparse/auto modes
    const worker = await createWorker(['nld', 'eng'])
    const results: ReturnType<typeof parseNutritionLabel>[] = []
    for (const psm of [PSM.SPARSE_TEXT, PSM.SINGLE_BLOCK, PSM.SINGLE_COLUMN] as const) {
      await worker.setParameters({ tessedit_pageseg_mode: psm })
      const { data: { text } } = await worker.recognize(buf)
      results.push(parseNutritionLabel(text))
    }
    await worker.terminate()

    const food = results.reduce<ReturnType<typeof parseNutritionLabel>>((best, r) => pickBest(best, r), null)

    if (!food) {
      return Response.json({ error: 'Could not extract nutritional information. Try a clearer photo of the nutrition label.' }, { status: 422 })
    }

    return Response.json(food)
  } catch (e) {
    console.error('Nutrition scan error:', e)
    return Response.json({ error: 'Failed to process image' }, { status: 500 })
  }
}

function pickBest(a: ReturnType<typeof parseNutritionLabel>, b: ReturnType<typeof parseNutritionLabel>) {
  if (!a) return b
  if (!b) return a
  // Prefer whichever has more non-zero fields
  const score = (r: NonNullable<typeof a>) =>
    (r.calories > 0 ? 1 : 0) + (r.proteinG > 0 ? 1 : 0) + (r.fatG > 0 ? 1 : 0) + (r.carbsG > 0 ? 1 : 0)
  return score(a) >= score(b) ? a : b
}

function fixOcrArtifacts(raw: string): string {
  return raw
    // Dutch decimal comma between digits → period
    .replace(/(\d),(\d)/g, '$1.$2')
    // 'l' between digit and digit/g → decimal point (e.g. "8lg" → "8.1g", "8l1" → "8.11")
    .replace(/(\d)l(\d)/g, '$1.$2')
    .replace(/(\d)lg/g, '$1.1 g')
    // Thousands separator: "1.154" → keep as-is (we'll parse kJ carefully)
    // Remove stray OCR noise glyphs after numbers
    .replace(/(\d)[¢©®°€$]/g, '$1')
    // Fix "O" misread as "0" in numeric context
    .replace(/\bO(\d)/g, '0$1')
}

function parseNutritionLabel(raw: string) {
  const fixed = fixOcrArtifacts(raw)
  const text = fixed.toLowerCase()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // ── Calories ─────────────────────────────────────────────────────────────
  let calories = 0
  const kcalMatch = text.match(/(\d+\.?\d*)\s*kcal/)
  if (kcalMatch) {
    calories = parseFloat(kcalMatch[1])
  } else {
    // kJ fallback (ignore thousands separator: "1.154 kj" → 1154 kJ)
    const kjMatch = text.match(/([\d.]+)\s*kj/)
    if (kjMatch) {
      const kj = parseFloat(kjMatch[1].replace(/\./g, '')) // strip thousands sep
      calories = Math.round(kj / 4.184)
    }
  }

  // ── Generic gram extractor ────────────────────────────────────────────────
  function findGrams(keywords: string[]): number {
    for (const kw of keywords) {
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes(kw)) continue
        // Try: digit(s) then optional decimal then 'g' on the same line
        const same = lines[i].match(/(\d+\.?\d*)\s*g\b/)
        if (same) return parseFloat(same[1])
        // Try: standalone number on the next line
        if (i + 1 < lines.length) {
          const next = lines[i + 1].match(/^(\d+\.?\d*)/)
          if (next) return parseFloat(next[1])
        }
      }
    }
    return 0
  }

  const proteinG = findGrams(['eiwitten', 'eiwit', 'protein', 'proteine', 'proteines', 'eiweiß'])
  const carbsG   = findGrams(['koolhydraten', 'carbohydrates', 'glucides', 'kohlenhydrate'])

  // Fat: only match lines that START with "vet"/"fat"/"fett" (skip sub-rows)
  let fatG = 0
  for (const line of lines) {
    if (/^(vet|fat|fett|lipides?|grassi)\b/.test(line)) {
      const m = line.match(/(\d+\.?\d*)\s*g\b/)
      if (m) { fatG = parseFloat(m[1]); break }
    }
  }

  // ── Sanity check ─────────────────────────────────────────────────────────
  if (calories === 0 && proteinG === 0 && carbsG === 0) return null

  // If calorie balance is way off, the fat digit may have been dropped (1x → x).
  // Fat has 9 kcal/g; protein and carbs have 4 kcal/g.
  if (calories > 0 && fatG > 0) {
    const estimated = fatG * 9 + (proteinG + carbsG) * 4
    // If actual calories are ~10 kcal/g more than estimated, a leading digit was lost
    if (calories - estimated > 50 && calories - estimated < 200) {
      const corrected = fatG + 10
      const estimatedCorrected = corrected * 9 + (proteinG + carbsG) * 4
      if (Math.abs(calories - estimatedCorrected) < Math.abs(calories - estimated)) {
        fatG = corrected
      }
    }
  }

  return {
    fdcId: Date.now(),
    description: 'Scanned Product',
    brandOwner: null,
    servingSize: 100,
    servingSizeUnit: 'g',
    calories: Math.round(calories * 10) / 10,
    proteinG: Math.round(proteinG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
  }
}
