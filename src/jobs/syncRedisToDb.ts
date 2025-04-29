import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import { redisClient } from '../config/redis';

// Configuration
const SYNC_INTERVAL = process.env.SYNC_INTERVAL
  ? parseInt(process.env.SYNC_INTERVAL)
  : 5 * 60 * 1000; // 5 minutes default
const CHUNK_SIZE = process.env.SYNC_CHUNK_SIZE ? parseInt(process.env.SYNC_CHUNK_SIZE) : 500;
const DISCREPANCY_THRESHOLD = process.env.DISCREPANCY_THRESHOLD
  ? parseInt(process.env.DISCREPANCY_THRESHOLD)
  : 5;

// Type definitions
interface EventRow extends RowDataPacket {
  id: number;
  max_capacity: number;
  registered_count: number;
}

interface SlotUpdate {
  id: number;
  redisSlots: number;
  dbExpected: number;
}

// Monitoring metrics
const metrics = {
  totalSyncs: 0,
  totalUpdated: 0,
  discrepancies: 0,
  lastDuration: 0,
};

// State management (why not use Go with mutex?!?!??)
let isSyncRunning = false;

export function startSyncJob(): void {
  // initial sync
  setTimeout(async () => {
    console.log('Starting initial Redis sync');
    await runSyncTask();
  }, 10000);

  // Recurring sync
  setInterval(async () => {
    await runSyncTask();
  }, SYNC_INTERVAL);

  console.log(`Sync job scheduled every ${SYNC_INTERVAL / 1000}s`);
}

async function runSyncTask(): Promise<void> {
  if (isSyncRunning) {
    console.log('Sync already running, skipping');
    return;
  }

  isSyncRunning = true;
  const startTime = Date.now();

  try {
    await syncSlotsWithDatabase();
    metrics.totalSyncs++;
    metrics.lastDuration = Date.now() - startTime;
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    isSyncRunning = false;
  }
}

async function syncSlotsWithDatabase(): Promise<void> {
  const pool = getPool();
  const [events] = await pool.query<EventRow[]>(
    'SELECT id, max_capacity, registered_count FROM events',
  );

  if (!events.length) {
    console.log('No events to sync');
    return;
  }

  // Parallel Redis reads
  const slotUpdates = await Promise.all(
    events.map(async (event): Promise<SlotUpdate | null> => {
      try {
        const redisSlots = await redisClient.get(`event:${event.id}:slots`);
        if (!redisSlots) return null;

        const redisCount = parseInt(redisSlots);
        const dbExpected = event.max_capacity - event.registered_count;

        return {
          id: event.id,
          redisSlots: redisCount,
          dbExpected,
        };
      } catch (error) {
        console.error(`Event ${event.id} sync error:`, error);
        return null;
      }
    }),
  );

  // Filter valid updates with discrepancies
  const updates = slotUpdates.filter(
    (update): update is SlotUpdate => !!update && update.redisSlots !== update.dbExpected,
  );

  if (!updates.length) {
    console.log('No slot updates needed');
    return;
  }

  console.log(`Found ${updates.length} discrepancies, updating...`);

  // Batch update with chunking and transactions
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await updateChunk(connection, chunk);
    }

    await connection.commit();
    metrics.totalUpdated += updates.length;
    metrics.discrepancies += updates.length;

    console.log(`Successfully updated ${updates.length} events`);
    logDiscrepancies(updates);
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function updateChunk(connection: any, chunk: SlotUpdate[]): Promise<void> {
  let caseClause = '';
  const caseParams: number[] = [];
  const whereIds: number[] = [];

  // first, get current max_capacity for these events
  const idPlaceholders = chunk.map(() => '?').join(',');
  const eventIds = chunk.map(update => update.id);

  const [events] = await connection.query(
    `SELECT id, max_capacity FROM events WHERE id IN (${idPlaceholders})`,
    eventIds,
  );

  const eventMap = new Map<number, number>();
  (events as any[]).forEach(event => {
    eventMap.set(event.id, event.max_capacity);
  });

  // prepare to update registered_count instead of available_slots
  chunk.forEach(update => {
    const maxCapacity = eventMap.get(update.id) || 0;
    const newRegisteredCount = maxCapacity - update.redisSlots;

    caseClause += 'WHEN id = ? THEN ? ';
    caseParams.push(update.id, newRegisteredCount);
    whereIds.push(update.id);
  });

  const query = `
    UPDATE events 
    SET registered_count = CASE ${caseClause} END 
    WHERE id IN (${chunk.map(() => '?').join(',')})
  `;

  await connection.query(query, [...caseParams, ...whereIds]);
}

function logDiscrepancies(updates: SlotUpdate[]): void {
  if (updates.length > DISCREPANCY_THRESHOLD) {
    console.warn(`High discrepancies: ${updates.length} events`);
  }

  updates.forEach(update => {
    console.log(
      `Event ${update.id}: ` + `Redis=${update.redisSlots} | ` + `DB Expected=${update.dbExpected}`,
    );
  });
}

export async function fullReconciliation(): Promise<void> {
  console.log('Starting full reconciliation');
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [events] = await connection.query<EventRow[]>(`
      SELECT 
        e.id, 
        e.max_capacity, 
        COUNT(r.id) as registered_count 
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id 
      GROUP BY e.id
    `);

    await Promise.all(
      events.map(async event => {
        const dbSlots = event.max_capacity - event.registered_count;

        // Force Redis to match database calculations
        await redisClient.set(`event:${event.id}:slots`, dbSlots.toString());

        // update registered_count (available_slots will be auto-calculated, cannot update a generated column like available_slots directly)
        await connection.query('UPDATE events SET registered_count = ? WHERE id = ?', [
          event.registration_count,
          event.id,
        ]);
      }),
    );

    await connection.commit();
    console.log(`Reconciled ${events.length} events`);
  } catch (error) {
    await connection.rollback();
    console.error('Reconciliation failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Health check endpoint data
export function getSyncMetrics() {
  return {
    ...metrics,
    status: isSyncRunning ? 'running' : 'idle',
    lastSync: new Date(Date.now() - metrics.lastDuration),
  };
}
