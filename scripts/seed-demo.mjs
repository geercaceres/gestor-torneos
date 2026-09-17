import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAction, seedState } from '../lib/tournament.mjs';
import { createOperations, initializeOperations, safeUser } from '../server/operations.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = resolve(root, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const output = process.argv[2] && resolve(root, process.argv[2]);
if (!output) throw new Error('Provide a new database path, for example: data/demo.sqlite');
if (existsSync(output)) throw new Error('The requested database already exists and was not overwritten.');
if (!process.env.ADMIN_PASSWORD_SALT || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error('Run npm run setup:admin first to generate local credentials.');
}

let state = seedState();
const act = (type, payload, now) => {
  state = applyAction(state, { type, payload }, now);
};

act('config', {
  title: 'Community Cup 2026',
  brand: 'TOURNAMENT MANAGER',
  locale: 'en',
  tagline: 'SPORT. COMMUNITY. COMPETITION.',
  subtitle: 'Follow matches, results, and updates from a community sports event.',
  sport: 'Futsal',
  participantSingular: 'Team',
  participantPlural: 'Teams',
  playingAreaSingular: 'Court',
  playingAreaPlural: 'Courts',
  currency: 'USD',
  scoringMode: 'winner',
  venue: 'Central Sports Complex',
  address: '123 Community Avenue',
  contact: '+1 555 010 2026',
  courts: 2,
  days: [{ date: '2026-10-10', startTime: '09:00', endTime: '18:00' }],
  duration: 45,
  entryFee: 40,
  prize: 300,
  prizeExtra: 'Trophy and medals',
  announcement: 'Check-in opens at 8:30 AM. Please arrive 15 minutes before your match.',
  scoring: 'Two 20-minute halves. Tied knockout matches are decided by a penalty shootout.',
  rules: [
    'The tournament uses single elimination. The winning team advances to the next round.',
    'Every team must arrive 15 minutes before its published start time.',
    'Start times are estimates and may change during the event.',
    'The organizer publishes calls and schedule changes on the website and official channel.',
    'Refereeing and disciplinary decisions follow the event regulations.'
  ].join('\n\n'),
  foodNote: 'The concession stand is open throughout the event. Availability updates in real time.'
});
act('resize', { size: 8, confirm: true });
act('teams', { teams: [
  'Northside Falcons', 'Riverside FC', 'City Pioneers', 'Central Athletic',
  'Green Union', 'Sunrise United', 'Oakwood FC', 'Red Stars'
].map((name, index) => ({ id: index + 1, name })) });
act('replan', { start: '2026-10-10T09:00', confirm: true });
act('result', { id: 1, winnerId: 1, reason: 'played', score: '4-2', note: '' }, '2026-10-10T09:42:00.000Z');
act('result', { id: 2, winnerId: 4, reason: 'played', score: '2-2 · penalties 4-3', note: '' }, '2026-10-10T09:47:00.000Z');
act('status', { id: 3, status: 'live' }, '2026-10-10T10:30:00.000Z');
act('status', { id: 4, status: 'called' }, '2026-10-10T10:30:00.000Z');

mkdirSync(dirname(output), { recursive: true });
const db = new DatabaseSync(output);
try {
  db.exec(readFileSync(resolve(root, 'server/schema.sql'), 'utf8'));
  db.prepare('INSERT INTO tournament(id,revision,document) VALUES(1,?,?)').run(state.revision, JSON.stringify(state));
  initializeOperations(db, {
    salt: process.env.ADMIN_PASSWORD_SALT,
    passwordHash: process.env.ADMIN_PASSWORD_HASH
  });
  db.prepare("UPDATE users SET name='Administrator' WHERE username='admin'").run();
  const operations = createOperations(db);
  const admin = safeUser(db.prepare("SELECT * FROM users WHERE username='admin'").get());
  const products = [
    ['Mineral water', 'Cold 500 ml bottle', 2, 1, 48, 10],
    ['Sports drink', '500 ml bottle', 4, 2, 24, 6],
    ['Club sandwich', 'Ham and cheese', 6, 3, 18, 5],
    ['Savory pastry', 'Beef or chicken', 3, 1, 30, 8]
  ];
  for (const [name, description, price, unitCost, initialStock, lowStockThreshold] of products) {
    operations.saveProduct(admin, { name, description, price, unitCost, initialStock, lowStockThreshold, active: true });
  }
  const catalog = operations.catalog(admin);
  operations.sell(admin, {
    requestKey: 'demo-sale-00000001', payment: 'cash',
    items: [{ productId: catalog[0].id, quantity: 3, expectedPrice: catalog[0].price }, { productId: catalog[2].id, quantity: 2, expectedPrice: catalog[2].price }]
  });
  operations.sell(admin, {
    requestKey: 'demo-sale-00000002', payment: 'transfer',
    items: [{ productId: catalog[1].id, quantity: 2, expectedPrice: catalog[1].price }, { productId: catalog[3].id, quantity: 4, expectedPrice: catalog[3].price }]
  });
  const demoPassword = randomBytes(18).toString('base64url');
  await operations.createUser(admin, { username: 'organizer.demo', name: 'Sports coordinator', role: 'tournament', password: demoPassword });
  await operations.createUser(admin, { username: 'cashier.demo', name: 'Main desk', role: 'cashier', password: demoPassword });
  await operations.createUser(admin, { username: 'food.demo', name: 'Food manager', role: 'food_manager', password: demoPassword });
} finally {
  db.close();
}

console.log('Demo database created at ' + output);
console.log('Sign in as admin using the password from your local access file.');
