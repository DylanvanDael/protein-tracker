import { pgTable, serial, text, real, timestamp, integer } from 'drizzle-orm/pg-core'

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

export const quickAdds = pgTable('quick_adds', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull().default('g'),
  calories: real('calories').notNull().default(0),
  proteinG: real('protein_g').notNull().default(0),
  fatG: real('fat_g').notNull().default(0),
  carbsG: real('carbs_g').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type QuickAdd = typeof quickAdds.$inferSelect
export type NewQuickAdd = typeof quickAdds.$inferInsert

export const goals = pgTable('goals', {
  id: integer('id').primaryKey().default(1),
  calories: real('calories').notNull().default(2000),
  proteinG: real('protein_g').notNull().default(100),
  fatG: real('fat_g').notNull().default(65),
  carbsG: real('carbs_g').notNull().default(200),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Goals = typeof goals.$inferSelect
