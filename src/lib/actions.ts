'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from './db'
import { foodEntries, goals, quickAdds } from './schema'
import type { Goals, QuickAdd } from './schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function addFoodEntry(data: {
  date: string
  foodName: string
  quantity: number
  unit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}) {
  await getDb().insert(foodEntries).values(data)
  revalidatePath('/')
}

export async function deleteFoodEntry(id: number) {
  await getDb().delete(foodEntries).where(eq(foodEntries.id, id))
  revalidatePath('/')
}

export async function updateFoodEntry(
  id: number,
  data: Partial<{
    foodName: string
    quantity: number
    unit: string
    calories: number
    proteinG: number
    fatG: number
    carbsG: number
  }>
) {
  await getDb().update(foodEntries).set(data).where(eq(foodEntries.id, id))
  revalidatePath('/')
}

export async function getEntriesForDate(date: string) {
  return getDb().query.foodEntries.findMany({
    where: eq(foodEntries.date, date),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}

const DEFAULT_GOALS: Goals = {
  id: 1,
  calories: 2000,
  proteinG: 100,
  fatG: 65,
  carbsG: 200,
  updatedAt: new Date(),
}

export async function getGoals(): Promise<Goals> {
  const rows = await getDb().select().from(goals).where(eq(goals.id, 1)).limit(1)
  return rows[0] ?? DEFAULT_GOALS
}

export async function updateGoals(data: {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}) {
  await getDb()
    .insert(goals)
    .values({ id: 1, ...data })
    .onConflictDoUpdate({
      target: goals.id,
      set: { ...data, updatedAt: sql`now()` },
    })
  revalidatePath('/')
}

export async function getQuickAdds(): Promise<QuickAdd[]> {
  return getDb().query.quickAdds.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
}

export async function addQuickAdd(data: {
  name: string
  quantity: number
  unit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}) {
  await getDb().insert(quickAdds).values(data)
  revalidatePath('/')
}

export async function deleteQuickAdd(id: number) {
  await getDb().delete(quickAdds).where(eq(quickAdds.id, id))
  revalidatePath('/')
}

// Recents are derived from the food log rather than stored separately —
// most recent distinct-by-name entries, newest first.
export async function getRecentFoods(limit = 10) {
  const rows = await getDb()
    .select({
      foodName: foodEntries.foodName,
      quantity: foodEntries.quantity,
      unit: foodEntries.unit,
      calories: foodEntries.calories,
      proteinG: foodEntries.proteinG,
      fatG: foodEntries.fatG,
      carbsG: foodEntries.carbsG,
      createdAt: foodEntries.createdAt,
    })
    .from(foodEntries)
    .orderBy(desc(foodEntries.createdAt))
    .limit(200)

  const seen = new Set<string>()
  const distinct: typeof rows = []
  for (const row of rows) {
    const key = row.foodName.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    distinct.push(row)
    if (distinct.length >= limit) break
  }
  return distinct
}
