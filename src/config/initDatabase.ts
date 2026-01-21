import { pool } from './database';
import fs from 'fs';
import path from 'path';

/**
 * Initialize database schema
 * Run this script once to set up all tables
 */
async function initDatabase() {
  try {
    console.log('Initializing database...');

    // Read SQL schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schemaSQL);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
