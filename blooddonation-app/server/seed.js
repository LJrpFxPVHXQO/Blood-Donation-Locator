import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blooddonation',
});

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

try {
  const passwordHash = await bcrypt.hash('test', 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
    ['Test User', 'test', passwordHash],
  );
  console.log('Seeded dummy account: test / test');

  const centers = [
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

  for (const [name, city, address, contact] of centers) {
    const [result] = await pool.execute(
      `INSERT INTO blood_centers (name, city, address, contact, status, operating_hours)
       VALUES (?, ?, ?, ?, 'open', '24/7')
       ON DUPLICATE KEY UPDATE address = VALUES(address), contact = VALUES(contact), status = VALUES(status), operating_hours = VALUES(operating_hours)`,
      [name, city, address, contact],
    );
    const centerId = result.insertId || (
      await pool.query('SELECT id FROM blood_centers WHERE name = ? AND city = ? LIMIT 1', [name, city])
    )[0][0]?.id;
    if (centerId) {
      for (const bt of bloodTypes) {
        const units = Math.floor(Math.random() * 20) + 2;
        await pool.execute(
          `INSERT INTO blood_inventory (center_id, blood_type, units_available, units_reserved, critical_threshold)
           VALUES (?, ?, ?, 0, 5)
           ON DUPLICATE KEY UPDATE units_available = VALUES(units_available)`,
          [centerId, bt, units],
        );
      }
    }
  }
  console.log('Seeded blood centers and inventory');
} finally {
  await pool.end();
}
