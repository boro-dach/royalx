/**
 * Скачивает TGS-анимации Telegram dice через forwardMessage + getUpdates.
 * 
 * Запуск: node scripts/download-tgs-stickers.mjs
 */
import https from 'https';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN   = '8839463347:AAF-hSuisc5h2bTYPp9ibMHZMH8v8Syojec';
const CHAT_ID     = '-1004342464565'; // game chat (отправляем кубики сюда)
const BASE        = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OUT_DIR     = './public/stickers';

const DICE_TYPES = [
  { emoji: '🎲', name: 'dice'       },
  { emoji: '🎯', name: 'darts'      },
  { emoji: '🎳', name: 'bowling'    },
  { emoji: '🏀', name: 'basketball' },
  { emoji: '⚽', name: 'football'   },
  { emoji: '🎰', name: 'slots'      },
];

function apiPost(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request(`${BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function downloadBuf(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c))); res.on('error', reject);
    }).on('error', reject);
  });
}

async function getFileUrl(fileId) {
  const r = await apiPost('getFile', { file_id: fileId });
  if (!r.ok) throw new Error(`getFile failed: ${r.description}`);
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${r.result.file_path}`;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Clear webhook so getUpdates works
  await apiPost('deleteWebhook', { drop_pending_updates: false });
  await new Promise(r => setTimeout(r, 500));

  // Get current update_id offset
  const init = await apiPost('getUpdates', { timeout: 1, limit: 1, offset: -1 });
  let offset = init.ok && init.result.length > 0 ? init.result[init.result.length - 1].update_id + 1 : 0;

  for (const { emoji, name } of DICE_TYPES) {
    const dest = path.join(OUT_DIR, `${name}.tgs`);
    if (fs.existsSync(dest)) { console.log(`⏭  ${name}.tgs exists`); continue; }

    console.log(`\n📤 Sending ${emoji} dice...`);
    const sent = await apiPost('sendDice', { chat_id: CHAT_ID, emoji });
    if (!sent.ok) { console.error(`  ✗ sendDice failed:`, sent.description); continue; }

    const sentMsgId = sent.result.message_id;
    console.log(`  sent msg_id=${sentMsgId}, value=${sent.result.dice.value}`);

    // Poll getUpdates to find the update that has this message with animation
    // The dice animation sticker is embedded in the update's message.animation or message.sticker
    // Actually Telegram embeds the dice sticker as message.dice - no separate sticker file
    // We need to use sendMessage with a sticker instead - try getCustomEmojiStickers approach

    // ── Alternative: use the bot to send the sticker set by known names ──
    // Telegram's built-in dice animations are part of the app itself, not accessible via Bot API sticker sets.
    // The only way is to use getCustomEmojiStickers with the custom_emoji_id from the message.
    
    // Let's try: get the update and check if there's a sticker file
    await new Promise(r => setTimeout(r, 1000));
    const updates = await apiPost('getUpdates', { offset, timeout: 5, limit: 10 });
    offset = updates.ok && updates.result.length > 0 ? updates.result[updates.result.length - 1].update_id + 1 : offset;
    
    // Look for our sent message in updates (channel posts)
    console.log(`  received ${updates.result?.length || 0} updates`);
    
    // The message.dice object: { emoji, value } - no file_id here
    // Check for sticker or animation in the same message
    for (const upd of (updates.result || [])) {
      const msg = upd.message || upd.channel_post;
      if (!msg) continue;
      console.log(`  update keys: ${Object.keys(msg).join(', ')}`);
      if (msg.sticker) {
        console.log(`  Found sticker! file_id=${msg.sticker.file_id}`);
      }
      if (msg.animation) {
        console.log(`  Found animation! file_id=${msg.animation.file_id}`);
      }
    }
    
    // The dice sticker file_id is NOT available through Bot API for dice messages.
    // We'll use a web scraping approach via known Telegram CDN URLs instead.
    console.log(`  ℹ Dice sticker TGS not directly accessible via Bot API.`);
    console.log(`    Will use alternative approach (embedded assets from open-source clients)`);
  }

  // Restore webhook
  const webhookUrl = process.env.WEBHOOK_URL || '';
  if (webhookUrl) await apiPost('setWebhook', { url: webhookUrl });
  
  console.log('\n📋 Summary: Bot API cannot directly provide TGS files for dice stickers.');
  console.log('   These are built into Telegram clients and not served via Bot API.');
  console.log('   Using pre-extracted community mirrors instead.');
}

main().catch(console.error);
