'use client'

import { useState } from 'react'
import { Calculator as CalcIcon, Delete } from 'lucide-react'

type Op = '+' | '−' | '×' | '÷'

function compute(a: number, b: number, op: Op): number {
  const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b
  // Trim binary-float noise (e.g. 0.1 + 0.2) without forcing a fixed precision.
  return Math.round((r + Number.EPSILON) * 1e10) / 1e10
}

function formatDisplay(s: string): string {
  if (s === 'Error') return s
  if (s.length > 12) {
    const n = Number(s)
    if (Number.isFinite(n)) return String(Number(n.toPrecision(10)))
  }
  return s
}

export default function Calculator() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [previous, setPrevious] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  // When true, the next digit starts a fresh number instead of appending.
  const [overwrite, setOverwrite] = useState(true)

  function clearAll() {
    setDisplay('0'); setPrevious(null); setOp(null); setOverwrite(true)
  }

  function inputDigit(d: string) {
    if (display === 'Error') { setDisplay(d); setOverwrite(false); setPrevious(null); setOp(null); return }
    if (overwrite) { setDisplay(d); setOverwrite(false) }
    else setDisplay(display === '0' ? d : display + d)
  }

  function inputDot() {
    if (display === 'Error') { setDisplay('0.'); setOverwrite(false); return }
    if (overwrite) { setDisplay('0.'); setOverwrite(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  function backspace() {
    if (overwrite || display === 'Error') return
    const next = display.slice(0, -1)
    setDisplay(next === '' || next === '-' ? '0' : next)
    if (next === '' || next === '-') setOverwrite(true)
  }

  function chooseOp(next: Op) {
    if (display === 'Error') return
    const current = Number(display)
    if (previous !== null && op && !overwrite) {
      const result = compute(previous, current, op)
      if (!Number.isFinite(result)) { setDisplay('Error'); setPrevious(null); setOp(null); setOverwrite(true); return }
      setPrevious(result)
      setDisplay(String(result))
    } else {
      setPrevious(current)
    }
    setOp(next)
    setOverwrite(true)
  }

  function equals() {
    if (op === null || previous === null || display === 'Error') return
    const result = compute(previous, Number(display), op)
    if (!Number.isFinite(result)) { setDisplay('Error') } else { setDisplay(String(result)) }
    setPrevious(null); setOp(null); setOverwrite(true)
  }

  const keyBase = 'h-14 rounded-2xl text-[20px] font-medium flex items-center justify-center active:opacity-60 transition-opacity select-none'
  const numKey = `${keyBase} bg-[var(--fill)] text-[var(--ink)]`
  const funcKey = `${keyBase} bg-[var(--fill-hover)] text-[var(--muted-strong)]`
  const opKey = (o: Op) =>
    `${keyBase} bg-[var(--accent)] text-white ${op === o && overwrite ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--card)]' : ''}`
  // Equals spans two rows, so it can't carry the fixed h-14 — let the grid size it.
  const eqKey = 'rounded-2xl text-[20px] font-medium flex items-center justify-center active:opacity-60 transition-opacity select-none bg-[var(--accent)] text-white row-span-2 h-full'

  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--fill)] flex items-center justify-center">
            <CalcIcon size={15} className="text-[var(--muted-strong)]" />
          </div>
          <span className="text-[15px] font-semibold text-[var(--ink)]">Calculator</span>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-[var(--faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[var(--hairline)] pt-4">
          {/* Display */}
          <div className="mb-3 px-4 py-4 rounded-2xl bg-[var(--fill)] min-h-[64px] flex items-center justify-end">
            <span className="text-[34px] font-semibold text-[var(--ink)] tabular-nums truncate">
              {formatDisplay(display)}
            </span>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={clearAll} className={funcKey}>AC</button>
            <button onClick={backspace} className={funcKey} aria-label="Delete"><Delete size={20} /></button>
            <button onClick={() => chooseOp('÷')} className={opKey('÷')}>÷</button>
            <button onClick={() => chooseOp('×')} className={opKey('×')}>×</button>

            <button onClick={() => inputDigit('7')} className={numKey}>7</button>
            <button onClick={() => inputDigit('8')} className={numKey}>8</button>
            <button onClick={() => inputDigit('9')} className={numKey}>9</button>
            <button onClick={() => chooseOp('−')} className={opKey('−')}>−</button>

            <button onClick={() => inputDigit('4')} className={numKey}>4</button>
            <button onClick={() => inputDigit('5')} className={numKey}>5</button>
            <button onClick={() => inputDigit('6')} className={numKey}>6</button>
            <button onClick={() => chooseOp('+')} className={opKey('+')}>+</button>

            <button onClick={() => inputDigit('1')} className={numKey}>1</button>
            <button onClick={() => inputDigit('2')} className={numKey}>2</button>
            <button onClick={() => inputDigit('3')} className={numKey}>3</button>
            <button onClick={equals} className={eqKey}>=</button>

            <button onClick={() => inputDigit('0')} className={`${numKey} col-span-2`}>0</button>
            <button onClick={inputDot} className={numKey}>.</button>
          </div>
        </div>
      )}
    </div>
  )
}
