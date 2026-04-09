import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'INVEXUS — Sistema Automotriz',
  description: 'Gestión integral MAXIAUTO / INVEXUS',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#0f172a' }}>{children}</body>
    </html>
  )
}
