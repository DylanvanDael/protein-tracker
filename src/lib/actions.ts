'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from './db'
import { foodEntries, goals } from './schema'
import type { Goals } from './schema'
import { eq, sql } from 'drizzle-orm'

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
