import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nutrition Tracker',
  description: 'Track your daily macros and calories',
}

// Apply the saved theme before first paint so there's no light/dark flash.
// Runs before React hydrates; ThemeToggle keeps it in sync thereafter.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
