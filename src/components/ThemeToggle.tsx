'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

// Applies an explicit theme by stamping data-theme on <html> (which the CSS
// tokens in globals.css key off) and persisting the choice. Defaults to the
// system preference until the user picks one. A tiny inline script in the root
// layout applies the saved value before paint so there's no flash.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    }
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.dataset.theme = next
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-full bg-[var(--fill)] flex items-center justify-center text-[var(--muted-strong)] active:opacity-60 transition-opacity shrink-0"
    >
      {/* Rendered only after mount so server and client first paint match */}
      {theme === 'dark' ? <Sun size={18} /> : theme === 'light' ? <Moon size={18} /> : null}
    </button>
  )
}
