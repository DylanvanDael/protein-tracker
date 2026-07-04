export interface FoodResult {
  fdcId: number
  description: string
  brandOwner: string | null
  servingSize: number
  servingSizeUnit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}

// What DetailEditor produces when the user confirms — either logged directly,
// pushed onto a combo-meal accumulator, or saved as a quick add.
export interface ConfirmedItem {
  foodName: string
  quantity: number
  unit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}

// Quick adds and recent-food rows both carry enough info to seed a DetailEditor
// the same way a search result does.
export function toFoodResult(item: {
  name?: string
  foodName?: string
  quantity: number
  unit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}): FoodResult {
  return {
    fdcId: Date.now(),
    description: item.name ?? item.foodName ?? '',
    brandOwner: null,
    servingSize: item.quantity || 100,
    servingSizeUnit: item.unit || 'g',
    calories: item.calories,
    proteinG: item.proteinG,
    fatG: item.fatG,
    carbsG: item.carbsG,
  }
}

export const BLANK_FOOD: FoodResult = {
  fdcId: 0,
  description: '',
  brandOwner: null,
  servingSize: 100,
  servingSizeUnit: 'g',
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
}
