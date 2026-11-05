import 'dotenv/config';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const databasePath = resolve(serverDirectory, process.env.DB_PATH || 'data/blooddonation.db');

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(readFileSync(resolve(serverDirectory, 'schema.sql'), 'utf8'));

// Databases created before profiles existed need the new columns added in place.
const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
['phone', 'address', 'date_of_birth'].forEach((column) => {
  if (!userColumns.has(column)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
  }
});

export default db;
