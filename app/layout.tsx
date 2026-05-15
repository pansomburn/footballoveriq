import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OverIQ — AI Football Intelligence',
  description: 'วิเคราะห์บอลสดอัจฉริยะ ทุกคู่ พร้อมกัน',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
