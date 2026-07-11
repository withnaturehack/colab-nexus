import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('Missing POSTGRES_PRISMA_URL or POSTGRES_URL');
  process.exit(1);
}

async function applyMigrations() {
  // Parse the connection string to handle SSL properly
  const url = new URL(dbUrl);
  const config = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
  };
  
  // Add SSL configuration if sslmode is in the URL
  if (dbUrl.includes('sslmode')) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database ✓\n');

    const migrationsDir = './supabase/migrations';
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Applying: ${file}`);

      try {
        await client.query(sql);
        console.log(`✓ Success\n`);
      } catch (e) {
        // Some errors are expected (like if table already exists)
        // Check if it's a non-critical error
        if (e.message.includes('already exists') || 
            e.message.includes('duplicate') ||
            e.message.includes('already defined')) {
          console.log(`⚠ Already exists (skipping)\n`);
        } else {
          console.error(`✗ Error: ${e.message}\n`);
          // Continue to next migration
        }
      }
    }

    console.log('All migrations processed!');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
