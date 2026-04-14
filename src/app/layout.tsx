import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Cofre de Memórias',
  description: 'Guarde seus momentos mais preciosos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vault',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F8F6' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D0D14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t=localStorage.getItem('theme');
                var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
                if((t||p)==='dark') document.documentElement.classList.add('dark');
              })();
            `,
          }}
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-[#F9F8F6] dark:bg-[#0D0D14] text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
