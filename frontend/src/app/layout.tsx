import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans',
});

const notoSansSinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-sinhala',
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tamil',
});

export const metadata: Metadata = {
  title: 'Goviya Plus — Smart Farm Platform',
  description: 'AI Smart Farm Records & Crop Advisory Platform for Sri Lankan Agriculture',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansSinhala.variable} ${notoSansTamil.variable}`}
    >
      <body className="min-h-screen bg-sand-50 text-ink-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
