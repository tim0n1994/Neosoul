import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import '@livekit/components-styles';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Neosoul',
  description: '一场漂浮在暧昧深空里的语音派对',
};

export const viewport: Viewport = {
  themeColor: '#08060a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={outfit.variable}>
      <body className="font-sans antialiased">
        {children}
        <div className="grain" />
      </body>
    </html>
  );
}
