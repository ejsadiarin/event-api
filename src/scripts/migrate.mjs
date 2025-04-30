import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database';

const runMigrations = async () => {
  const pool = getPool();

  try {
    console.log('Running database migrations...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../src/migrations/init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migrations
    await pool.query(sql);

    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
