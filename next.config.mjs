/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: false,
  images: { unoptimized: true },
  env: {
    // Bridges Railway environment variables (supports VITE_*, plain, and NEXT_PUBLIC_* naming)
    NEXT_PUBLIC_BOT_USERNAME:
      process.env.NEXT_PUBLIC_BOT_USERNAME ||
      process.env.VITE_BOT_USERNAME ||
      process.env.BOT_USERNAME ||
      'RXcasbot',
    NEXT_PUBLIC_CHANNEL_USERNAME:
      process.env.NEXT_PUBLIC_CHANNEL_USERNAME ||
      process.env.VITE_CHANNEL_USERNAME ||
      process.env.CHANNEL_USERNAME ||
      'RoyalX_Win',
    NEXT_PUBLIC_CHANNEL_URL:
      process.env.NEXT_PUBLIC_CHANNEL_URL ||
      process.env.VITE_CHANNEL_URL ||
      process.env.CHANNEL_URL ||
      'https://t.me/RoyalX_Win',
    NEXT_PUBLIC_SUPPORT_USERNAME:
      process.env.NEXT_PUBLIC_SUPPORT_USERNAME ||
      process.env.VITE_SUPPORT_USERNAME ||
      process.env.SUPPORT_USERNAME ||
      'MartinCartier',
    NEXT_PUBLIC_SUPPORT_URL:
      process.env.NEXT_PUBLIC_SUPPORT_URL ||
      process.env.VITE_SUPPORT_URL ||
      process.env.SUPPORT_URL ||
      'https://t.me/MartinCartier',
    NEXT_PUBLIC_TERMS_URL:
      process.env.NEXT_PUBLIC_TERMS_URL ||
      process.env.VITE_TERMS_URL ||
      process.env.TERMS_URL ||
      'https://telegra.ph/POLZOVATELSKOE-SOGLASHENIE-ROYAL-X-09-18',
    NEXT_PUBLIC_RULES_URL:
      process.env.NEXT_PUBLIC_RULES_URL ||
      process.env.VITE_RULES_URL ||
      process.env.RULES_URL ||
      'https://telegra.ph/PRAVILA-ISPOLZOVANIYA-SERVISA-ROYAL-X-09-18',
    NEXT_PUBLIC_PRIVACY_URL:
      process.env.NEXT_PUBLIC_PRIVACY_URL ||
      process.env.VITE_PRIVACY_URL ||
      process.env.PRIVACY_URL ||
      'https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-ROYAL-X-09-18',
    NEXT_PUBLIC_SUPERADMIN_ID:
      process.env.NEXT_PUBLIC_SUPERADMIN_ID ||
      process.env.VITE_SUPERADMIN_ID ||
      process.env.SUPERADMIN_ID ||
      '8281274109',
    NEXT_PUBLIC_TRC20_WALLET:
      process.env.NEXT_PUBLIC_TRC20_WALLET ||
      process.env.VITE_TRC20_WALLET ||
      process.env.TRC20_WALLET ||
      'TYDzsYUEpvnYmQk4zGP9sWWcTEd36d53dB',
    NEXT_PUBLIC_TON_WALLET:
      process.env.NEXT_PUBLIC_TON_WALLET ||
      process.env.VITE_TON_WALLET ||
      process.env.TON_WALLET ||
      'UQCq7UgQ1bhs9pI8dw5juHB1cYwo1wgcQ0zxqd8eCRktwGVD',
    NEXT_PUBLIC_XROCKET_PAY_URL:
      process.env.NEXT_PUBLIC_XROCKET_PAY_URL ||
      process.env.VITE_XROCKET_PAY_URL ||
      process.env.XROCKET_PAY_URL ||
      'https://t.me/xrocket',
    NEXT_PUBLIC_CRYPTOBOT_PAY_URL:
      process.env.NEXT_PUBLIC_CRYPTOBOT_PAY_URL ||
      process.env.VITE_CRYPTOBOT_PAY_URL ||
      process.env.CRYPTOBOT_PAY_URL ||
      'https://t.me/CryptoBot',
  },
};

export default nextConfig;
