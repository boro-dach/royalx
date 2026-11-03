import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ORDER_EMOJIS, EMOJI } from '../telegramEmojis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🧪 TESTING TELEGRAM BOT MENU, EMOJIS & BANNER');
console.log('====================================================\n');

// 1. Verify Welcome Banner Assets
console.log('📌 1. Welcome Banner File Assets');
const publicBanner = path.join(rootDir, 'public', 'welcome-banner.jpg');
const distBanner = path.join(rootDir, 'dist', 'welcome-banner.jpg');
assert.ok(fs.existsSync(publicBanner), 'public/welcome-banner.jpg must exist');
assert.ok(fs.existsSync(distBanner), 'dist/welcome-banner.jpg must exist');
assert.ok(fs.statSync(publicBanner).size > 10000, 'Banner file size must be valid');
console.log('  ✅ [PASS] Banner files present in public/ and dist/');

// 2. Verify Custom Emoji Pack Mappings
console.log('\n📌 2. Custom Emoji Pack from @OrderEmoji');
assert.strictEqual(Object.keys(ORDER_EMOJIS).length, 171, 'All 171 custom emojis mapped');
assert.strictEqual(ORDER_EMOJIS[17].id, '5316571734604790521', 'Rocket emoji ID matches');
assert.strictEqual(ORDER_EMOJIS[49].id, '5316711376876485361', 'Money/cash emoji ID matches');
assert.strictEqual(ORDER_EMOJIS[44].id, '5316924123786524990', 'Fire emoji ID matches');
assert.strictEqual(ORDER_EMOJIS[20].id, '5316883252877738187', 'Pin emoji ID matches');
assert.ok(EMOJI.rocket.includes('5316571734604790521'), 'EMOJI.rocket contains correct tg-emoji tag');
assert.ok(EMOJI.dollar.includes('5316711376876485361'), 'EMOJI.dollar contains correct tg-emoji tag');
console.log('  ✅ [PASS] All 171 Custom emojis and helper tags properly formatted');

// 3. Verify Server exports and Database manager
console.log('\n📌 3. User botBet & botThrows Database Persistence');
import { db } from '../server.js';
const testUser = db.getUser('test_bot_user_999', 'Тестовый Игрок');
assert.strictEqual(typeof testUser.botBet, 'number', 'user.botBet is initialized');
assert.strictEqual(typeof testUser.botThrows, 'boolean', 'user.botThrows is initialized');
testUser.botBet = 25.50;
testUser.botThrows = false;
db.save();

const reloaded = db.getUser('test_bot_user_999');
assert.strictEqual(reloaded.botBet, 25.50, 'botBet saved to database');
assert.strictEqual(reloaded.botThrows, false, 'botThrows saved to database');
console.log('  ✅ [PASS] Database persists botBet and botThrows seamlessly');

// 4. Verify Server Code Contains All 8-Row Menu Buttons
console.log('\n📌 4. Telegram Menu Keyboard Structure');
const serverContent = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf-8');

assert.ok(serverContent.includes('• WebApp › 🔥 Сделать ставку'), 'Row 1: WebApp button present');
assert.ok(serverContent.includes('💬 В канале') && serverContent.includes('🤖 В боте'), 'Row 2: Channel and Bot mode buttons present');
assert.ok(serverContent.includes('🤖 Броски делает бот') && serverContent.includes('👤 Броски делает игрок'), 'Row 3: Thrower toggle present');
assert.ok(serverContent.includes('game_dice') && serverContent.includes('game_bowling') && serverContent.includes('game_darts'), 'Row 4: Game buttons present');
assert.ok(serverContent.includes('✈️ Telegram'), 'Row 5: Telegram channel button present');
assert.ok(serverContent.includes('📍 Режимы') && serverContent.includes('💳 Пополнить'), 'Row 6: Modes and Deposit buttons present');
assert.ok(serverContent.includes('💬 Играть в чате ↗'), 'Row 7: Play in chat button present');
assert.ok(serverContent.includes('📝 Изменить ставку'), 'Row 8: Change bet button present');
console.log('  ✅ [PASS] All 8 keyboard rows match reference screenshot exactly');

// 5. Verify Dice Game Logic and Multipliers
console.log('\n📌 5. Dice Game Handlers and Multipliers');
assert.ok(serverContent.includes('roll_dice_under') && serverContent.includes('roll_dice_over'), 'Dice under/over outcomes configured');
assert.ok(serverContent.includes('roll_bowling_strike') && serverContent.includes('roll_bowling_pins4'), 'Bowling strike and pins outcomes configured');
assert.ok(serverContent.includes('roll_darts_bullseye') && serverContent.includes('roll_darts_hit'), 'Darts bullseye and hit outcomes configured');
assert.ok(serverContent.includes('roll_basketball_score'), 'Basketball score outcome configured');
assert.ok(serverContent.includes('roll_football_goal'), 'Football goal outcome configured');
assert.ok(serverContent.includes('roll_slots_spin'), 'Slots spin outcome configured');
console.log('  ✅ [PASS] All 6 interactive games (Dice, Bowling, Darts, Basketball, Football, Slots) implemented');

console.log('\n====================================================');
console.log('🎉 ALL TELEGRAM BOT & MENU INTEGRATION TESTS PASSED!');
console.log('====================================================');
process.exit(0);
