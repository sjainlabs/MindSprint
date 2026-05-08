import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

let databasePromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

export const getDatabase = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
  if (!databasePromise) {
    const dbFolder = path.dirname(fileURLToPath(import.meta.url));
    await mkdir(dbFolder, { recursive: true });
    const dbPath = path.join(dbFolder, 'mindsprint.sqlite');

    databasePromise = open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const db = await databasePromise;

    await db.exec(`
      CREATE TABLE IF NOT EXISTS diagnostic_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        level TEXT NOT NULL,
        final_score REAL NOT NULL,
        accuracy_score REAL NOT NULL,
        speed_score REAL NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS worksheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worksheet_id TEXT NOT NULL,
        level TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  return databasePromise;
};
