import { pgTable, serial, text, real, timestamp } from 'drizzle-orm/pg-core'

export const foodEntries = pgTable('food_entries', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  foodName: text('food_name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull().default('g'),
  calories: real('calories').notNull().default(0),
  proteinG: real('protein_g').notNull().default(0),
  fatG: real('fat_g').notNull().default(0),
  carbsG: real('carbs_g').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type FoodEntry = typeof foodEntries.$inferSelect
export type NewFoodEntry = typeof foodEntries.$inferInsert
