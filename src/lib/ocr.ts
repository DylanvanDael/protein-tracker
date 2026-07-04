import type { FoodResult } from '@/components/food-search/types'

export function prepareImageForOcr(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Scale up small images for better OCR, cap large ones to keep it fast
      const TARGET = 1600
      let { width, height } = img
      const scale = Math.min(TARGET / Math.max(width, height), 2) // max 2× upscale
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png')
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function nutritionScore(f: FoodResult | null) {
  if (!f) return 0
  return (f.calories > 0 ? 1 : 0) + (f.proteinG > 0 ? 1 : 0) + (f.fatG > 0 ? 1 : 0) + (f.carbsG > 0 ? 1 : 0)
}

export function parseNutritionLabel(raw: string): FoodResult | null {
  const fixed = raw
    .replace(/(\d),(\d)/g, '$1.$2')   // Dutch decimal comma
    .replace(/(\d)l(\d)/g, '$1.$2')   // 'l' OCR artifact between digits
    .replace(/(\d)lg/g, '$1.1 g')     // "8lg" → "8.1 g"
    .replace(/(\d)[¢©®°€$]/g, '$1')   // stray noise after digits
  const text = fixed.toLowerCase()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Calories
  let calories = 0
  const kcalM = text.match(/(\d+\.?\d*)\s*kcal/)
  if (kcalM) {
    calories = parseFloat(kcalM[1])
  } else {
    const kjM = text.match(/([\d.]+)\s*kj/)
    if (kjM) calories = Math.round(parseFloat(kjM[1].replace(/\./g, '')) / 4.184)
  }

  // Generic: find grams after a keyword
  function findGrams(keywords: string[]): number {
    for (const kw of keywords) {
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes(kw)) continue
        const m = lines[i].match(/(\d+\.?\d*)\s*g\b/)
        if (m) return parseFloat(m[1])
        if (i + 1 < lines.length) {
          const m2 = lines[i + 1].match(/^(\d+\.?\d*)/)
          if (m2) return parseFloat(m2[1])
        }
      }
    }
    return 0
  }

  const proteinG = findGrams(['eiwitten', 'eiwit', 'protein', 'proteine', 'proteines'])
  const carbsG   = findGrams(['koolhydraten', 'carbohydrates', 'glucides'])

  // Fat: only lines that START with the fat keyword (skip sub-items)
  let fatG = 0
  for (const line of lines) {
    if (/^(vet|fat|fett|lipides?)\b/.test(line)) {
      const m = line.match(/(\d+\.?\d*)\s*g\b/)
      if (m) { fatG = parseFloat(m[1]); break }
    }
  }

  // Calorie-balance correction: if a leading digit was dropped from fat
  if (calories > 0 && fatG > 0) {
    const est = fatG * 9 + (proteinG + carbsG) * 4
    const diff = calories - est
    if (diff > 50 && diff < 200) {
      const corrected = fatG + 10
      if (Math.abs(calories - (corrected * 9 + (proteinG + carbsG) * 4)) < Math.abs(diff)) {
        fatG = corrected
      }
    }
  }

  if (calories === 0 && proteinG === 0 && carbsG === 0) return null

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
