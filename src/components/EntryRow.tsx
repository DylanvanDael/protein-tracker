'use client'

import { useState, useRef } from 'react'
import { Trash2, Pencil, Check } from 'lucide-react'
import { deleteFoodEntry, updateFoodEntry } from '@/lib/actions'
import type { FoodEntry } from '@/lib/schema'

export default function EntryRow({ entry }: { entry: FoodEntry }) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.foodName)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleDelete() {
    setDeleting(true)
    await deleteFoodEntry(entry.id)
  }

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed) { setName(entry.foodName); setEditing(false); return }
    setEditing(false)
    if (trimmed !== entry.foodName) {
      await updateFoodEntry(entry.id, { foodName: trimmed })
    }
  }

  return (
    <div className={`flex items-center gap-3 py-3 transition-opacity ${deleting ? 'opacity-30' : ''}`}>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setName(entry.foodName); setEditing(false) }
            }}
            className="text-[14px] font-medium text-[#1C1C1E] w-full bg-[#F2F2F7] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#007AFF]/40"
          />
        ) : (
          <button onClick={startEdit} className="text-left w-full group flex items-center gap-1.5">
            <p className="text-[14px] font-medium text-[#1C1C1E] truncate">{name}</p>
            <Pencil size={11} className="text-[#C7C7CC] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
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
        {editing ? (
          <button
            onClick={saveName}
            className="p-1.5 rounded-full text-[#34C759] hover:bg-[#F0FFF4] transition-colors"
          >
            <Check size={14} />
          </button>
        ) : (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-full text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[#FFF0F0] transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
