import { Suspense } from 'react'
import { getEntriesForDate, getGoals, getQuickAdds, getRecentFoods } from '@/lib/actions'
import MacroRing from '@/components/MacroRing'
import FoodSearch from '@/components/FoodSearch'
import EntryRow from '@/components/EntryRow'
import DateNav from '@/components/DateNav'
import GoalSettings from '@/components/GoalSettings'
import ThemeToggle from '@/components/ThemeToggle'
import Calculator from '@/components/Calculator'

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
  const [entries, goalRow, quickAdds, recentFoods] = await Promise.all([
    getEntriesForDate(date),
    getGoals(),
    getQuickAdds(),
    getRecentFoods(10),
  ])

  const GOALS = {
    calories: goalRow.calories,
    protein: goalRow.proteinG,
    carbs: goalRow.carbsG,
    fat: goalRow.fatG,
  }

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
    <main className="min-h-screen bg-[var(--canvas)]">
      <div className="max-w-md mx-auto px-4 pt-12 pb-24 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <h1 className="text-[28px] font-bold text-[var(--ink)] tracking-tight">Nutrition</h1>
            <ThemeToggle />
          </div>
          <Suspense fallback={<div className="text-[17px] font-semibold text-[var(--ink)]">Today</div>}>
            <DateNav date={date} />
          </Suspense>
        </div>

        {/* Calorie card */}
        {(() => {
          const calDiff = Math.round(totals.calories - GOALS.calories)
          const calOver = calDiff > 0
          const pct = Math.min((totals.calories / GOALS.calories) * 100, 100)
          return (
            <div className="bg-[var(--card)] rounded-3xl px-5 py-5 shadow-sm border border-[var(--border)]">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[13px] font-medium text-[var(--muted)] uppercase tracking-wide">Calories</p>
                  <p className="text-[36px] font-bold text-[var(--ink)] leading-none mt-1">
                    {Math.round(totals.calories)}
                  </p>
                  <p className="text-[13px] text-[var(--muted)] mt-1">of {Math.round(GOALS.calories)} kcal goal</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-[var(--muted)]">
                    {calOver ? 'Over goal' : 'Remaining'}
                  </p>
                  <p className="text-[22px] font-semibold text-[var(--accent)]">
                    {calOver ? `+${calDiff}` : Math.abs(calDiff)}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })()}

        {/* Macro rings */}
        <div className="bg-[var(--card)] rounded-3xl px-5 py-5 shadow-sm border border-[var(--border)]">
          <p className="text-[13px] font-medium text-[var(--muted)] uppercase tracking-wide mb-4">Macros</p>
          <div className="flex justify-around">
            <MacroRing value={totals.protein} goal={GOALS.protein} color="var(--green)" label="Protein" />
            <MacroRing value={totals.carbs} goal={GOALS.carbs} color="var(--orange)" label="Carbs" />
            <MacroRing value={totals.fat} goal={GOALS.fat} color="var(--danger)" label="Fat" />
          </div>
          {(() => {
            const diff = {
              protein: Math.round(totals.protein - GOALS.protein),
              carbs:   Math.round(totals.carbs   - GOALS.carbs),
              fat:     Math.round(totals.fat      - GOALS.fat),
            }
            const macros = [
              { key: 'protein', label: 'P', color: 'var(--green)' },
              { key: 'carbs',   label: 'C', color: 'var(--orange)' },
              { key: 'fat',     label: 'F', color: 'var(--danger)' },
            ] as const
            return (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--hairline)]">
                {[
                  { label: 'Goal',  protein: GOALS.protein,   carbs: GOALS.carbs,   fat: GOALS.fat },
                  { label: 'Eaten', protein: totals.protein,  carbs: totals.carbs,  fat: totals.fat },
                ].map(row => (
                  <div key={row.label} className="text-center">
                    <p className="text-[11px] text-[var(--muted)] font-medium mb-1">{row.label}</p>
                    {macros.map(m => (
                      <p key={m.key} className="text-[12px] font-semibold" style={{ color: m.color }}>
                        {Math.round(row[m.key])}g {m.label}
                      </p>
                    ))}
                  </div>
                ))}
                <div className="text-center">
                  <p className="text-[11px] text-[var(--muted)] font-medium mb-1">
                    {Object.values(diff).some(d => d > 0) ? 'Over' : 'Left'}
                  </p>
                  {macros.map(m => {
                    const d = diff[m.key]
                    const over = d > 0
                    return (
                      <p key={m.key} className="text-[12px] font-semibold" style={{ color: m.color }}>
                        {over ? `+${d}` : Math.abs(d)}g {m.label}
                      </p>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Food log */}
        <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <p className="text-[13px] font-medium text-[var(--muted)] uppercase tracking-wide">Food Log</p>
          </div>
          {entries.length === 0 ? (
            <div className="px-5 pb-5 pt-2">
              <p className="text-[14px] text-[var(--faint)] text-center py-4">No food logged yet</p>
            </div>
          ) : (
            <div className="px-5 divide-y divide-[var(--hairline)]">
              {entries.map(entry => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
          {entries.length > 0 && (
            <div className="mx-5 mb-5 mt-3 pt-3 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-[13px] text-[var(--muted)] font-medium">{entries.length} items</span>
              <span className="text-[13px] font-semibold text-[var(--ink)]">{Math.round(totals.calories)} kcal total</span>
            </div>
          )}
        </div>

        {/* Add food */}
        <Suspense fallback={null}>
          <FoodSearch date={date} initialQuickAdds={quickAdds} initialRecentFoods={recentFoods} />
        </Suspense>

        {/* Goal settings */}
        <GoalSettings initialGoals={goalRow} />

        {/* Calculator */}
        <Calculator />

      </div>
    </main>
  )
}
