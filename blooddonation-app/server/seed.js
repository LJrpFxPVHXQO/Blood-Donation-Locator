import bcrypt from 'bcryptjs';
import db, { seedBloodCenters } from './db.js';

const passwordHash = await bcrypt.hash('test', 12);

db.prepare(
  `INSERT INTO users (name, email, password_hash)
   VALUES (?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash`,
).run('Test User', 'test', passwordHash);
console.log('Seeded dummy account: test / test');

seedBloodCenters({ reset: true });
console.log('Seeded blood centers and inventory');

db.close();
