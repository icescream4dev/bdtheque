import * as SQLite from 'expo-sqlite';

// Initialise la connexion de manière asynchrone (expo-sqlite "next")
export const getDbConnection = async () => {
  return await SQLite.openDatabaseAsync('bedetheque.db');
};

export const initDB = async () => {
  try {
    const db = await getDbConnection();

    // Table "Series"
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        authors TEXT,
        coverImage TEXT
      );
    `);

    // Table "Volumes" (Tomes)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS volumes (
        id TEXT PRIMARY KEY,
        seriesId TEXT,
        title TEXT,
        volumeNumber INTEGER,
        publishedDate TEXT,
        isbn TEXT,
        coverImage TEXT,
        isRead INTEGER DEFAULT 0,
        FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
