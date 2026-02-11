import * as SQLite from 'expo-sqlite';

export const migrateDb = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      file_path TEXT,
      parsed_structure_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      project_site TEXT,
      site_name TEXT,
      service_line TEXT,
      floor TEXT,
      area TEXT,
      age TEXT,
      ref_code TEXT,
      description TEXT,
      location_lat REAL,
      location_lng REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY NOT NULL,
      site_name TEXT NOT NULL,
      trade TEXT,
      surveyor_name TEXT,
      status TEXT DEFAULT 'draft',
      gps_lat REAL,
      gps_lng REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asset_inspections (
      id TEXT PRIMARY KEY NOT NULL,
      survey_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      condition_rating TEXT,
      overall_condition TEXT,
      quantity_installed INTEGER,
      quantity_working INTEGER,
      remarks TEXT,
      gps_lat REAL,
      gps_lng REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      client TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY NOT NULL,
      asset_inspection_id TEXT,
      survey_id TEXT,
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_inspection_id) REFERENCES asset_inspections(id),
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );

    CREATE TABLE IF NOT EXISTS reviewer_comments (
      id TEXT PRIMARY KEY NOT NULL,
      asset_inspection_id TEXT NOT NULL,
      reviewer_role TEXT,
      comments TEXT,
      photo_paths TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_inspection_id) REFERENCES asset_inspections(id)
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY NOT NULL,
      survey_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );
  `);

  // Phase 7 Migration: Add location to surveys if missing
  try {
    await db.runAsync('ALTER TABLE surveys ADD COLUMN location TEXT');
    console.log('Added location column to surveys');
  } catch (e) {
    // Column likely exists, ignore
  }

  console.log('Database migrated successfully');
};
