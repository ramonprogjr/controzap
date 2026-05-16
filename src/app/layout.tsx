import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ToastProvider } from '@/components/ui/ToastContainer'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ControlZap | CRM Inteligente para WhatsApp',
  description: 'Gerencie conversas, leads e automações do seu time de vendas no WhatsApp com inteligência artificial.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={plusJakarta.variable}>
      <body className={`antialiased ${plusJakarta.className}`}>
        <ToastProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
