// Application-wide configuration derived from environment variables
const rawBot = (import.meta.env.VITE_BOT_USERNAME || 'RXcasbot').replace(/^@/, '');
const cleanBot = (!rawBot || rawBot === 'RoyalX_Bot') ? 'RXcasbot' : rawBot;

const rawChannel = (import.meta.env.VITE_CHANNEL_USERNAME || 'RXgambling').replace(/^@/, '');
const cleanChannel = (!rawChannel || rawChannel === 'RoyalX_Win') ? 'RXgambling' : rawChannel;

export const APP_CONFIG = {
  botUsername: cleanBot,
  channelUsername: cleanChannel,
  channelUrl: (import.meta.env.VITE_CHANNEL_URL || `https://t.me/${cleanChannel}`).replace('RoyalX_Win', 'RXgambling'),
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
