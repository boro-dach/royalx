import './globals.css';

export const metadata = {
  title: 'RoyalX — Telegram Mini App',
  robots: 'noindex, nofollow, noarchive, nosnippet',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..700&display=swap" rel="stylesheet" />
        <script src="https://telegram.org/js/telegram-web-app.js" defer={true} />
        <link rel="preload" as="image" href="/logo-icon.png" />
        <link rel="preload" as="image" href="/apple-gem.png" />
        <link rel="preload" as="image" href="/apple-bomb.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
