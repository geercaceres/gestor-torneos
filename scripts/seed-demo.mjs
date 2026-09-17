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
if (!output) throw new Error('Indicá una base nueva, por ejemplo: data/demo.sqlite');
if (existsSync(output)) throw new Error('La base indicada ya existe. No se sobrescribió.');
if (!process.env.ADMIN_PASSWORD_SALT || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error('Primero ejecutá npm run setup:admin para generar credenciales locales.');
}

let state = seedState();
const act = (type, payload, now) => {
  state = applyAction(state, { type, payload }, now);
};

act('config', {
  title: 'Copa Comunidad 2026',
  brand: 'GESTOR DE TORNEOS',
  tagline: 'DEPORTE. COMUNIDAD. COMPETENCIA.',
  subtitle: 'Seguí los partidos, resultados y novedades de una jornada deportiva abierta a toda la comunidad.',
  sport: 'Futsal',
  participantSingular: 'Equipo',
  participantPlural: 'Equipos',
  playingAreaSingular: 'Cancha',
  playingAreaPlural: 'Canchas',
  currency: 'PYG',
  scoringMode: 'winner',
  venue: 'Complejo Deportivo Central',
  address: 'Av. Principal 1234, Asunción',
  contact: '+595 981 000 000',
  courts: 2,
  days: [{ date: '2026-10-10', startTime: '09:00', endTime: '18:00' }],
  duration: 45,
  entryFee: 150000,
  prize: 1000000,
  prizeExtra: 'Trofeo y medallas',
  announcement: 'Acreditación desde las 08:30. Presentarse 15 minutos antes de cada partido.',
  scoring: 'Dos tiempos de 20 minutos. En caso de empate eliminatorio se define por penales.',
  rules: [
    'El torneo se disputa con eliminación directa. El equipo ganador avanza a la siguiente ronda.',
    'Cada equipo debe presentarse 15 minutos antes del horario publicado.',
    'Los horarios son estimados y pueden ajustarse durante la jornada.',
    'La organización comunica llamados y cambios por la web y el canal oficial.',
    'Las decisiones arbitrales y disciplinarias se rigen por el reglamento del evento.'
  ].join('\n\n'),
  foodNote: 'Cantina abierta durante toda la jornada. Stock actualizado en tiempo real.'
});
act('resize', { size: 8, confirm: true });
act('teams', { teams: [
  'Halcones del Sur', 'Barrio Norte FC', 'Los Pioneros', 'Atlético Central',
  'Unión Verde', 'Deportivo Sol', 'San Miguel', 'Estrella Roja'
].map((name, index) => ({ id: index + 1, name })) });
act('replan', { start: '2026-10-10T09:00', confirm: true });
act('result', { id: 1, winnerId: 1, reason: 'played', score: '4-2', note: '' }, '2026-10-10T09:42:00.000Z');
act('result', { id: 2, winnerId: 4, reason: 'played', score: '2-2 · penales 4-3', note: '' }, '2026-10-10T09:47:00.000Z');
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
  const operations = createOperations(db);
  const admin = safeUser(db.prepare("SELECT * FROM users WHERE username='admin'").get());
  const products = [
    ['Agua mineral', 'Botella fría de 500 ml', 8000, 3500, 48, 10],
    ['Bebida isotónica', 'Botella de 500 ml', 12000, 6500, 24, 6],
    ['Sándwich mixto', 'Jamón y queso', 15000, 8000, 18, 5],
    ['Empanada', 'Carne o pollo', 10000, 5000, 30, 8]
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
  await operations.createUser(admin, { username: 'organizacion.demo', name: 'Coordinación deportiva', role: 'tournament', password: demoPassword });
  await operations.createUser(admin, { username: 'caja.demo', name: 'Mesa principal', role: 'cashier', password: demoPassword });
  await operations.createUser(admin, { username: 'cantina.demo', name: 'Responsable de cantina', role: 'food_manager', password: demoPassword });
} finally {
  db.close();
}

console.log('Base demo creada en ' + output);
console.log('Ingresá con el usuario admin y la contraseña de tu archivo local de acceso.');
