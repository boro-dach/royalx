// Application-wide configuration derived from environment variables
export const APP_CONFIG = {
  botUsername: import.meta.env.VITE_BOT_USERNAME || 'RoyalX_Bot',
  channelUsername: import.meta.env.VITE_CHANNEL_USERNAME || 'RoyalX_Win',
  channelUrl: import.meta.env.VITE_CHANNEL_URL || 'https://t.me/RoyalX_Win',
  supportUsername: import.meta.env.VITE_SUPPORT_USERNAME || 'MartinCartier',
  supportUrl: import.meta.env.VITE_SUPPORT_URL || 'https://t.me/MartinCartier',
  termsUrl: import.meta.env.VITE_TERMS_URL || 'https://telegra.ph/POLZOVATELSKOE-SOGLASHENIE-ROYAL-X-09-18',
  rulesUrl: import.meta.env.VITE_RULES_URL || 'https://telegra.ph/PRAVILA-ISPOLZOVANIYA-SERVISA-ROYAL-X-09-18',
  privacyUrl: import.meta.env.VITE_PRIVACY_URL || 'https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-ROYAL-X-09-18',
  superAdminId: import.meta.env.VITE_SUPERADMIN_ID || '8281274109',
  trc20Wallet: import.meta.env.VITE_TRC20_WALLET || 'TYDzsYUEpvnYmQk4zGP9sWWcTEd36d53dB',
  tonWallet: import.meta.env.VITE_TON_WALLET || 'UQCq7UgQ1bhs9pI8dw5juHB1cYwo1wgcQ0zxqd8eCRktwGVD',
  xrocketPayUrl: import.meta.env.VITE_XROCKET_PAY_URL || 'https://t.me/xrocket',
  cryptobotPayUrl: import.meta.env.VITE_CRYPTOBOT_PAY_URL || 'https://t.me/CryptoBot'
};
