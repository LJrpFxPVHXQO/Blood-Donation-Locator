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

export const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const defaultCenters = [
  ['East Avenue Medical Center Blood Bank', 'Quezon City', 'East Avenue, Diliman, Quezon City', '+63 2 928-0611'],
  ['National Kidney and Transplant Institute Blood Bank', 'Quezon City', 'East Avenue, Quezon City', '+63 2 8981-0300'],
  ['Philippine General Hospital Blood Bank', 'Manila', 'Taft Avenue, Ermita, Manila', '+63 2 8554-8400'],
  ['Manila Doctors Hospital Blood Bank', 'Manila', '667 United Nations Ave, Ermita, Manila', '+63 2 558-0888'],
  ['Caloocan City Medical Center Blood Bank', 'Caloocan City', 'Caloocan City', '+63 2 961-4971'],
  ['Makati Medical Center Blood Bank', 'Makati', '2 Amorsolo St, Legazpi Village, Makati', '+63 2 8888-8999'],
  ['San Juan De Dios Hospital Blood Bank', 'Pasay City', '2772 Roxas Blvd, Pasay City', '+63 2 831-9731'],
  ['Rizal Medical Center Blood Bank', 'Rizal Main', 'Pasig Boulevard, Pasig City', '+63 2 8651-7800'],
  ['Ospital ng Muntinlupa Blood Bank', 'Muntinlupa', 'Katarungan St, Poblacion, Muntinlupa', '+63 2 8626-3931'],
];

// Inserts the default blood centers with sample stock. With reset=true, existing stock is overwritten.
export function seedBloodCenters({ reset = false } = {}) {
  const upsertCenter = db.prepare(
    `INSERT INTO blood_centers (name, city, address, contact, status, operating_hours)
     VALUES (?, ?, ?, ?, 'open', '24/7')
     ON CONFLICT(name, city) DO UPDATE SET
       address = excluded.address,
       contact = excluded.contact,
       status = excluded.status,
       operating_hours = excluded.operating_hours,
       last_updated = CURRENT_TIMESTAMP`,
  );
  const findCenter = db.prepare('SELECT id FROM blood_centers WHERE name = ? AND city = ?');
  const upsertStock = db.prepare(
    `INSERT INTO blood_inventory (center_id, blood_type, units_available, units_reserved, critical_threshold)
     VALUES (?, ?, ?, 0, 5)
     ON CONFLICT(center_id, blood_type) DO UPDATE SET
       units_available = ${reset ? 'excluded.units_available' : 'blood_inventory.units_available'}`,
  );

  db.exec('BEGIN');
  try {
    for (const [name, city, address, contact] of defaultCenters) {
      upsertCenter.run(name, city, address, contact);
      const { id } = findCenter.get(name, city);
      for (const bloodType of bloodTypes) {
        upsertStock.run(id, bloodType, Math.floor(Math.random() * 20) + 2);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Fills an empty database so the locator works without running the seed script.
if (db.prepare('SELECT COUNT(*) AS total FROM blood_centers').get().total === 0) {
  seedBloodCenters();
}

export default db;
