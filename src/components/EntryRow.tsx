'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteFoodEntry } from '@/lib/actions'
import type { FoodEntry } from '@/lib/schema'

export default function EntryRow({ entry }: { entry: FoodEntry }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteFoodEntry(entry.id)
  }

  return (
    <div className={`flex items-center gap-3 py-3 transition-opacity ${deleting ? 'opacity-30' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[#1C1C1E] truncate">{entry.foodName}</p>
        <p className="text-[12px] text-[#8E8E93] mt-0.5">
          {entry.quantity}{entry.unit} · {Math.round(entry.calories)} kcal
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="flex gap-3">
            <span className="text-[12px] text-[#34C759] font-medium">{Math.round(entry.proteinG)}g P</span>
            <span className="text-[12px] text-[#FF9F0A] font-medium">{Math.round(entry.carbsG)}g C</span>
            <span className="text-[12px] text-[#FF453A] font-medium">{Math.round(entry.fatG)}g F</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-full text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[#FFF0F0] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
