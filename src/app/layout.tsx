import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nutrition Tracker',
  description: 'Track your daily macros and calories',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
