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
        age INTEGER NOT NULL DEFAULT 8,
        grade INTEGER NOT NULL DEFAULT 3,
        mastery_json TEXT NOT NULL,
        topic_mastery_json TEXT NOT NULL DEFAULT '{}',
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
        topic_id TEXT,
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

      CREATE TABLE IF NOT EXISTS diagnostic_unlocks (
        student_id TEXT PRIMARY KEY,
        unlocked_grade INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS diagnostic_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        grade INTEGER NOT NULL,
        age INTEGER NOT NULL,
        accuracy_score REAL NOT NULL,
        final_score REAL NOT NULL,
        unlocked_next_grade INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_diagnostic_records_student_created
      ON diagnostic_records (student_id, created_at);
    `);

    const studentProfileColumns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(student_profiles)`);
    const studentProfileColumnNames = new Set(studentProfileColumns.map((column) => column.name));
    if (!studentProfileColumnNames.has('age')) {
      await db.exec(`ALTER TABLE student_profiles ADD COLUMN age INTEGER NOT NULL DEFAULT 8`);
    }
    if (!studentProfileColumnNames.has('grade')) {
      await db.exec(`ALTER TABLE student_profiles ADD COLUMN grade INTEGER NOT NULL DEFAULT 3`);
    }
    if (!studentProfileColumnNames.has('topic_mastery_json')) {
      await db.exec(`ALTER TABLE student_profiles ADD COLUMN topic_mastery_json TEXT NOT NULL DEFAULT '{}'`);
    }

    const analyticsColumns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(analytics_events)`);
    const analyticsColumnNames = new Set(analyticsColumns.map((column) => column.name));
    if (!analyticsColumnNames.has('topic_id')) {
      await db.exec(`ALTER TABLE analytics_events ADD COLUMN topic_id TEXT`);
    }
  }

  return databasePromise;
};
