import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool: mysql.Pool;

export const initDB = async () => {
    // temp pool for init
    const tempPool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        multipleStatements: true,
    });

    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);
    await tempPool.end();

    // global main connection pool
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        multipleStatements: true
    });

    let migrationPath;
    // check if we're in production (compiled) or development environment
    if (fs.existsSync(path.join(__dirname, '../migrations/init.sql'))) {
        // dev path
        migrationPath = path.join(__dirname, '../migrations/init.sql');
    } else {
        // prod path (after esbuild)
        migrationPath = path.join(__dirname, '../../src/migrations/init.sql');
    }

    console.log('Using migration path:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
        console.error('Migration file not found at:', migrationPath);
        throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        // Execute SQL with multiple statements
        await pool.query(sql);
        console.log('Database migrations executed successfully');
    } catch (error) {
        console.error('Error executing migrations:', error);
        throw error;
    }

    return pool;
};

export const getPool = () => {
    if (!pool) throw new Error('Database pool not initialized');
    return pool;
};
