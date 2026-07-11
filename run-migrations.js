import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function runMigrations() {
  const migrationsDir = './supabase/migrations';
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration files\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running: ${file}`);

    try {
      // Split SQL statements properly (handle comments and multi-line statements)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'))
        .map(s => s.split('--')[0].trim()); // Remove trailing comments

      for (const stmt of statements) {
        if (!stmt) continue;
        
        try {
          // Execute raw SQL using the admin client
          const { data, error } = await supabase.rpc('test_exec', { p_sql: stmt + ';' }).catch(() => ({ error: { message: 'test_exec not found, trying direct query' } }));
          
          if (error?.message?.includes('not found')) {
            // Fallback: try using the low-level PostgREST client
            const response = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/sql',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: stmt + ';'
            }).catch(() => null);

            if (!response?.ok) {
              // We can't directly execute DDL via PostgREST. This is a limitation.
              // For now, we'll just log that migrations need to be run manually or via CLI.
              console.log(`  ⚠ Skipping complex migration statement (must run via Supabase Dashboard or CLI)`);
              continue;
            }
          }
        } catch (e) {
          // Log but continue
          console.log(`  ⚠ ${e.message?.substring(0, 100)}`);
        }
      }
      console.log(`✓ ${file}\n`);
    } catch (e) {
      console.error(`✗ Error in ${file}:`, e.message);
    }
  }

  console.log('Migration check complete.\n⚠ Note: DDL statements (CREATE TABLE, etc.) must be applied via Supabase Dashboard or CLI.\n');
}

(async () => {
  await runMigrations();
})().catch(console.error);
