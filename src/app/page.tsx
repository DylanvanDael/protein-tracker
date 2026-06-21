import { Suspense } from 'react'
import { getEntriesForDate } from '@/lib/actions'
import MacroRing from '@/components/MacroRing'
import FoodSearch from '@/components/FoodSearch'
import EntryRow from '@/components/EntryRow'
import DateNav from '@/components/DateNav'

const GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams
  const date = dateParam ?? todayString()
  const entries = await getEntriesForDate(date)

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.proteinG ?? 0),
      carbs: acc.carbs + (e.carbsG ?? 0),
      fat: acc.fat + (e.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <main className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-md mx-auto px-4 pt-12 pb-24 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Nutrition</h1>
          <Suspense fallback={<div className="text-[17px] font-semibold text-[#1C1C1E]">Today</div>}>
            <DateNav date={date} />
          </Suspense>
        </div>

        {/* Calorie card */}
        <div className="bg-white rounded-3xl px-5 py-5 shadow-sm border border-[#E5E5EA]">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Calories</p>
              <p className="text-[36px] font-bold text-[#1C1C1E] leading-none mt-1">
                {Math.round(totals.calories)}
              </p>
              <p className="text-[13px] text-[#8E8E93] mt-1">of {GOALS.calories} kcal goal</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-[#8E8E93]">Remaining</p>
              <p className="text-[22px] font-semibold text-[#007AFF]">
                {Math.max(0, GOALS.calories - Math.round(totals.calories))}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totals.calories / GOALS.calories) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Macro rings */}
        <div className="bg-white rounded-3xl px-5 py-5 shadow-sm border border-[#E5E5EA]">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide mb-4">Macros</p>
          <div className="flex justify-around">
            <MacroRing value={totals.protein} goal={GOALS.protein} color="#34C759" label="Protein" />
            <MacroRing value={totals.carbs} goal={GOALS.carbs} color="#FF9F0A" label="Carbs" />
            <MacroRing value={totals.fat} goal={GOALS.fat} color="#FF453A" label="Fat" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#F2F2F7]">
            {[
              { label: 'Goal', protein: GOALS.protein, carbs: GOALS.carbs, fat: GOALS.fat },
              { label: 'Eaten', protein: totals.protein, carbs: totals.carbs, fat: totals.fat },
              {
                label: 'Left',
                protein: Math.max(0, GOALS.protein - totals.protein),
                carbs: Math.max(0, GOALS.carbs - totals.carbs),
                fat: Math.max(0, GOALS.fat - totals.fat),
              },
            ].map(row => (
              <div key={row.label} className="text-center">
                <p className="text-[11px] text-[#8E8E93] font-medium mb-1">{row.label}</p>
                <p className="text-[12px] text-[#34C759] font-semibold">{Math.round(row.protein)}g P</p>
                <p className="text-[12px] text-[#FF9F0A] font-semibold">{Math.round(row.carbs)}g C</p>
                <p className="text-[12px] text-[#FF453A] font-semibold">{Math.round(row.fat)}g F</p>
              </div>
            ))}
          </div>
        </div>

        {/* Food log */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Food Log</p>
          </div>
          {entries.length === 0 ? (
            <div className="px-5 pb-5 pt-2">
              <p className="text-[14px] text-[#C7C7CC] text-center py-4">No food logged yet</p>
            </div>
          ) : (
            <div className="px-5 divide-y divide-[#F2F2F7]">
              {entries.map(entry => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
          {entries.length > 0 && (
            <div className="mx-5 mb-5 mt-3 pt-3 border-t border-[#E5E5EA] flex justify-between items-center">
              <span className="text-[13px] text-[#8E8E93] font-medium">{entries.length} items</span>
              <span className="text-[13px] font-semibold text-[#1C1C1E]">{Math.round(totals.calories)} kcal total</span>
            </div>
          )}
        </div>

        {/* Add food */}
        <Suspense fallback={null}>
          <FoodSearch date={date} />
        </Suspense>
      </div>
    </main>
  )
}
