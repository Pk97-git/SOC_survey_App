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
      zone TEXT,
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

  /**
   * Helper to safely add a column only if it doesn't already exist.
   * This replaces fragile try/catch blocks that masked real SQLite errors.
   */
  const addColumnIfNotExists = async (table: string, column: string, typeDef: string) => {
    const columns: any[] = await db.getAllAsync(`PRAGMA table_info(${table})`);
    if (!columns.some(col => col.name === column)) {
      await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
      console.log(`Added ${column} column to ${table}`);
    }
  };

  // Phase 7 Migration: Add location to surveys if missing
  await addColumnIfNotExists('surveys', 'location', 'TEXT');

  // Phase 8 Migration: Add sync fields
  await addColumnIfNotExists('surveys', 'synced', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('surveys', 'server_id', 'TEXT');
  await addColumnIfNotExists('surveys', 'last_synced_at', 'TEXT');

  await addColumnIfNotExists('asset_inspections', 'synced', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('asset_inspections', 'server_id', 'TEXT');

  await addColumnIfNotExists('photos', 'synced', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('photos', 'server_id', 'TEXT');
  await addColumnIfNotExists('photos', 'uploaded', 'INTEGER DEFAULT 0');

  // Phase 9 Migration: Add zone/building/location to assets
  await addColumnIfNotExists('assets', 'zone', 'TEXT');
  await addColumnIfNotExists('assets', 'building', 'TEXT');
  await addColumnIfNotExists('assets', 'location', 'TEXT');

  // Phase 10 Migration: Sanitize Corrupted Data (Precision Fix)
  try {
    // Force conversion of any float values to integers to prevent JSI crashes
    await db.runAsync('UPDATE asset_inspections SET quantity_installed = CAST(quantity_installed AS INTEGER)');
    await db.runAsync('UPDATE asset_inspections SET quantity_working = CAST(quantity_working AS INTEGER)');
    console.log('Sanitized asset_inspections integer columns');
  } catch (e) {
    console.warn('Failed to sanitize inspection data:', e);
  }

  // Phase 11 Migration: Add site_id to surveys (required for proper backend sync)
  await addColumnIfNotExists('surveys', 'site_id', 'TEXT');

  // Phase 12 Migration: Add surveyor_id to surveys (for claim tracking)
  await addColumnIfNotExists('surveys', 'surveyor_id', 'TEXT');

  // Phase 13 Migration: Add sync_failed flag to surveys (dead-letter queue)
  await addColumnIfNotExists('surveys', 'sync_failed', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('surveys', 'sync_error', 'TEXT');

  // Phase 14 Migration: Add performance indexes to SQLite
  try {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_surveys_site_id ON surveys(site_id);
      CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
      CREATE INDEX IF NOT EXISTS idx_asset_inspections_survey_id ON asset_inspections(survey_id);
      CREATE INDEX IF NOT EXISTS idx_asset_inspections_asset_id ON asset_inspections(asset_id);
      CREATE INDEX IF NOT EXISTS idx_photos_asset_inspection_id ON photos(asset_inspection_id);
      CREATE INDEX IF NOT EXISTS idx_photos_survey_id ON photos(survey_id);
      CREATE INDEX IF NOT EXISTS idx_assets_project_site ON assets(project_site);
    `);
    console.log('Added performance indexes');
  } catch (e) {
    console.warn('Index creation skipped:', e);
  }

  // Phase 15 Migration: Add review JSON columns to asset_inspections
  // Required to store MAG, CIT, DGDA review data filled in during the survey
  await addColumnIfNotExists('asset_inspections', 'mag_review', 'TEXT');
  await addColumnIfNotExists('asset_inspections', 'cit_review', 'TEXT');
  await addColumnIfNotExists('asset_inspections', 'dgda_review', 'TEXT');

  // Phase 16 Migration: Add photos column to asset_inspections to prevent offline data loss
  await addColumnIfNotExists('asset_inspections', 'photos', 'TEXT');

  console.log('Database migrated successfully');
};
