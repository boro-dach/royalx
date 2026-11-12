// Application-wide configuration derived from environment variables
// Supports NEXT_PUBLIC_*, VITE_* (from previous Vite deployment), and plain names
const getEnv = (nextKey, viteKey, plainKey, fallback = '') => {
  return (
    process.env[nextKey] ||
    process.env[viteKey] ||
    process.env[plainKey] ||
    fallback
  );
};

const rawBot = getEnv('NEXT_PUBLIC_BOT_USERNAME', 'VITE_BOT_USERNAME', 'BOT_USERNAME', 'RXcasbot').replace(/^@/, '');
const cleanBot = (!rawBot || rawBot === 'RoyalX_Bot') ? 'RXcasbot' : rawBot;

const rawChannel = getEnv('NEXT_PUBLIC_CHANNEL_USERNAME', 'VITE_CHANNEL_USERNAME', 'CHANNEL_USERNAME', 'RoyalX_Win').replace(/^@/, '');
const cleanChannel = (!rawChannel || rawChannel === 'RXgambling') ? 'RoyalX_Win' : rawChannel;

const rawCreatorChannel = getEnv('NEXT_PUBLIC_CREATOR_CHANNEL_USERNAME', 'VITE_CREATOR_CHANNEL_USERNAME', 'CREATOR_CHANNEL_USERNAME', 'psyhozlite').replace(/^@/, '');
const cleanCreatorChannel = rawCreatorChannel || 'psyhozlite';

export const APP_CONFIG = {
  botUsername: cleanBot,
  channelUsername: cleanChannel,
  channelUrl: getEnv('NEXT_PUBLIC_CHANNEL_URL', 'VITE_CHANNEL_URL', 'CHANNEL_URL', `https://t.me/${cleanChannel}`).replace('RXgambling', 'RoyalX_Win'),
  creatorChannelUsername: cleanCreatorChannel,
  creatorChannelUrl: getEnv('NEXT_PUBLIC_CREATOR_CHANNEL_URL', 'VITE_CREATOR_CHANNEL_URL', 'CREATOR_CHANNEL_URL', `https://t.me/${cleanCreatorChannel}`),
  chatUrl: getEnv('NEXT_PUBLIC_CHAT_URL', 'VITE_CHAT_URL', 'GAME_CHAT_URL', 'https://t.me/+Ap1x2JyKGlpkMmNi'),
  supportUsername: getEnv('NEXT_PUBLIC_SUPPORT_USERNAME', 'VITE_SUPPORT_USERNAME', 'SUPPORT_USERNAME', 'MartinCartier'),
  supportUrl: getEnv('NEXT_PUBLIC_SUPPORT_URL', 'VITE_SUPPORT_URL', 'SUPPORT_URL', 'https://t.me/MartinCartier'),
  termsUrl: getEnv('NEXT_PUBLIC_TERMS_URL', 'VITE_TERMS_URL', 'TERMS_URL', 'https://telegra.ph/POLZOVATELSKOE-SOGLASHENIE-ROYAL-X-09-18'),
  rulesUrl: getEnv('NEXT_PUBLIC_RULES_URL', 'VITE_RULES_URL', 'RULES_URL', 'https://telegra.ph/PRAVILA-ISPOLZOVANIYA-SERVISA-ROYAL-X-09-18'),
  privacyUrl: getEnv('NEXT_PUBLIC_PRIVACY_URL', 'VITE_PRIVACY_URL', 'PRIVACY_URL', 'https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-ROYAL-X-09-18'),
  superAdminId: getEnv('NEXT_PUBLIC_SUPERADMIN_ID', 'VITE_SUPERADMIN_ID', 'SUPERADMIN_ID', '8281274109'),
  trc20Wallet: getEnv('NEXT_PUBLIC_TRC20_WALLET', 'VITE_TRC20_WALLET', 'TRC20_WALLET', 'TYDzsYUEpvnYmQk4zGP9sWWcTEd36d53dB'),
  tonWallet: getEnv('NEXT_PUBLIC_TON_WALLET', 'VITE_TON_WALLET', 'TON_WALLET', 'UQCq7UgQ1bhs9pI8dw5juHB1cYwo1wgcQ0zxqd8eCRktwGVD'),
  xrocketPayUrl: getEnv('NEXT_PUBLIC_XROCKET_PAY_URL', 'VITE_XROCKET_PAY_URL', 'XROCKET_PAY_URL', 'https://t.me/xrocket'),
  cryptobotPayUrl: getEnv('NEXT_PUBLIC_CRYPTOBOT_PAY_URL', 'VITE_CRYPTOBOT_PAY_URL', 'CRYPTOBOT_PAY_URL', 'https://t.me/CryptoBot')
};

export const MANDATORY_CHANNELS = [
  {
    id: 'channel',
    badge: 'ОФИЦИАЛЬНЫЙ КАНАЛ',
    name: 'Royal X Channel',
    handle: `@${cleanChannel}`,
    url: APP_CONFIG.channelUrl,
    btnText: 'Подписаться ↗',
    type: 'channel'
  },
  {
    id: 'creator',
    badge: 'КАНАЛ СОЗДАТЕЛЯ',
    name: 'Канал создателя',
    handle: `@${cleanCreatorChannel}`,
    url: APP_CONFIG.creatorChannelUrl,
    btnText: 'Подписаться ↗',
    type: 'creator'
  },
  {
    id: 'chat',
    badge: 'ЧАТ ИГРОКОВ',
    name: 'Royal X Chat',
    handle: 'Общение и розыгрыши',
    url: APP_CONFIG.chatUrl,
    btnText: 'Вступить ↗',
    type: 'chat'
  }
];
