/**
 * database/migrate.js
 * ---------------------------------------------------------------------------
 * Minimal, dependency-light migration runner.
 *
 * - Reads every .sql file in ./migrations in filename order.
 * - Tracks applied files in a `schema_migrations` table.
 * - Skips already-applied files, so it's safe to run repeatedly (idempotent).
 *
 * Run with:  npm run migrate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // 001_, 002_, ... run in order

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true, // a migration file may contain several statements
  });

  // Bookkeeping table so we never apply the same migration twice.
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name       VARCHAR(255) NOT NULL,
       applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (name)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );

  const [rows] = await connection.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map(r => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• skip    ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [
        file,
      ]);
      console.log(`✓ applied ${file}`);
      count += 1;
    } catch (error) {
      console.error(`✗ FAILED  ${file}: ${error.message}`);
      await connection.end();
      process.exit(1);
    }
  }

  console.log(count === 0 ? 'Nothing to migrate.' : `Done. Applied ${count}.`);
  await connection.end();
}

main().catch(error => {
  console.error('Migration runner error:', error.message);
  process.exit(1);
});
