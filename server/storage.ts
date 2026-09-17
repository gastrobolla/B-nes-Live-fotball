import fs from 'fs';
import path from 'path';
import { BonesClubData } from '../src/types.js';
import { getClubData } from './bonesData.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bones_database.json');

/**
 * Loads persisted club data from disk or initializes if first time.
 */
export function loadPersistedData(): BonesClubData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as BonesClubData;

      // Verify that parsed object contains minimal required structure
      if (parsed && Array.isArray(parsed.teams) && parsed.tables && Array.isArray(parsed.matches)) {
        console.log(`[Storage] Persisted database loaded successfully from ${DB_FILE} (Version: ${parsed.dataVersion || 1}, Last saved: ${parsed.lastDiskSaved || 'N/A'}).`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.error('[Storage] Error reading persisted database file, falling back to initial seed data:', err.message);
  }

  // If not found or error, initialize from seed data
  console.log('[Storage] Initializing fresh database from verified seed data and saving to disk...');
  const initial = getClubData();
  initial.dataVersion = 1;
  initial.lastDiskSaved = new Date().toLocaleString('no-NO');
  savePersistedData(initial);
  return initial;
}

/**
 * Saves club data to disk atomically to prevent data loss on server restarts.
 */
export function savePersistedData(data: BonesClubData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    data.dataVersion = (data.dataVersion || 0) + 1;
    data.lastDiskSaved = new Date().toLocaleString('no-NO');

    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err: any) {
    console.error('[Storage] Error saving database to disk:', err.message);
  }
}
