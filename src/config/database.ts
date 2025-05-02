import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { dbQueryDuration } from '../utils/metrics';
import { v4 as uuidv4 } from 'uuid';

export const executeQuery = async <T>(sql: string, params: any[] = []): Promise<T> => {
  if (!pool) throw new Error('Database pool not initialized');

  const table = extractTableFromQuery(sql);
  const operation = extractOperationType(sql);
  const queryId = uuidv4().substring(0, 8);

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message: 'Database query execution',
      service: 'event-api',
      queryId,
      operation,
      table,
      sql: process.env.NODE_ENV === 'production' ? undefined : sql, // Only log SQL in non-production
    }),
  );

  const timer = dbQueryDuration.startTimer();
  try {
    const result = await pool.query(sql, params);
    return result as unknown as T;
  } catch (error) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: 'Database query failed',
        service: 'event-api',
        queryId,
        operation,
        table,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
    throw error;
  } finally {
    timer({ operation, table });
  }
};

// Helper function to extract table name from SQL
const extractTableFromQuery = (sql: string): string => {
  // Simple regex - will need refinement for complex queries
  const fromMatch = sql.match(/FROM\s+(\w+)/i);
  const intoMatch = sql.match(/INTO\s+(\w+)/i);
  const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);

  if (fromMatch) return fromMatch[1];
  if (intoMatch) return intoMatch[1];
  if (updateMatch) return updateMatch[1];
  if (deleteMatch) return deleteMatch[1];

  return 'unknown';
};

// Helper function to extract operation type
const extractOperationType = (sql: string): string => {
  const trimmedSql = sql.trim().toUpperCase();

  if (trimmedSql.startsWith('SELECT')) return 'select';
  if (trimmedSql.startsWith('INSERT')) return 'insert';
  if (trimmedSql.startsWith('UPDATE')) return 'update';
  if (trimmedSql.startsWith('DELETE')) return 'delete';
  if (trimmedSql.startsWith('CREATE')) return 'create';
  if (trimmedSql.startsWith('ALTER')) return 'alter';
  if (trimmedSql.startsWith('DROP')) return 'drop';

  return 'other';
};

let pool: mysql.Pool;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initDB = async () => {
  let retries = 5;
  let lastError: any;
  let connected = false;

  while (retries > 0 && !connected) {
    try {
      // temp pool for init
      const tempPool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        multipleStatements: true,
        connectTimeout: 10000, // 10 seconds timeout
      });

      await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);
      await tempPool.end();
      connected = true;
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        // calculate delay with exponential backoff (1s, 2s, 4s, 8s...)
        const delay = Math.pow(2, 5 - retries) * 1000;
        console.log(
          `Connection to MySQL failed, retrying in ${delay / 1000}s... (${retries} attempts left)`,
        );
        await sleep(delay);
      }
    }
  }

  if (!connected) {
    console.error('Failed to connect to MySQL after multiple attempts:', lastError);
    throw lastError;
  }

  // global main connection pool
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    multipleStatements: true,
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
