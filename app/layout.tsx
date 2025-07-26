import './globals.css'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { AuthProvider } from '../components/AuthProvider'
import { DevTools } from '../components/DevTools'

export const metadata = {
  title: 'AdvanceWeekly - See beyond the busy.',
  description: 'Transform your weekly work into meaningful insights with AI-powered performance assessments.',
  icons: {
    icon: '/brand/10_favicon32.png',
    shortcut: '/brand/10_favicon32.png',
    apple: '/brand/06_icon_circle.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/10_favicon32.png" />
        <link rel="apple-touch-icon" href="/brand/06_icon_circle.png" />
      </head>
      <body className="font-sans text-neutral-900 bg-neutral-100 transition-advance">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-pill focus:transition-advance">
          Skip to main content
        </a>
        <AuthProvider>
          <ErrorBoundary>
            <main id="main-content">
              {children}
            </main>
          </ErrorBoundary>
        </AuthProvider>
        <DevTools />
      </body>
    </html>
  )
}