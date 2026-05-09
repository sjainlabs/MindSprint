import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

let databasePromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

export const getDatabase = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
  if (!databasePromise) {
    const dbFolder = __dirname;
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

      CREATE TABLE IF NOT EXISTS student_profiles (
        student_id TEXT PRIMARY KEY,
        mastery_json TEXT NOT NULL,
        xp INTEGER NOT NULL,
        level INTEGER NOT NULL,
        streak INTEGER NOT NULL,
        badges_json TEXT NOT NULL,
        learning_path_level INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        worksheet_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        accuracy REAL NOT NULL,
        duration_seconds REAL NOT NULL,
        mastery_after REAL NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_events_student_created
      ON analytics_events (student_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_analytics_events_student_operation
      ON analytics_events (student_id, operation);
    `);
  }

  return databasePromise;
};
