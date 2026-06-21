'use server'

import { revalidatePath } from 'next/cache'
import { db } from './db'
import { foodEntries } from './schema'
import { eq } from 'drizzle-orm'

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
  await db.insert(foodEntries).values(data)
  revalidatePath('/')
}

export async function deleteFoodEntry(id: number) {
  await db.delete(foodEntries).where(eq(foodEntries.id, id))
  revalidatePath('/')
}

export async function getEntriesForDate(date: string) {
  return db.query.foodEntries.findMany({
    where: eq(foodEntries.date, date),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}
