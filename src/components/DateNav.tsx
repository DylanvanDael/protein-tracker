'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function formatDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yestStr) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function offset(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DateNav({ date }: { date: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function go(d: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', d)
    router.push(`/?${params.toString()}`)
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isFuture = date >= todayStr

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => go(offset(date, -1))}
        className="p-2 rounded-full hover:bg-[#E5E5EA] transition-colors text-[#1C1C1E]"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => go(todayStr)}
        className="text-[17px] font-semibold text-[#1C1C1E] hover:text-[#007AFF] transition-colors"
      >
        {formatDisplay(date)}
      </button>
      <button
        onClick={() => go(offset(date, 1))}
        disabled={isFuture}
        className="p-2 rounded-full hover:bg-[#E5E5EA] transition-colors text-[#1C1C1E] disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
