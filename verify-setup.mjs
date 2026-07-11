import pg from 'pg';

const { Client } = pg;
const dbUrl = process.env.POSTGRES_PRISMA_URL;

const url = new URL(dbUrl);
const config = {
  user: url.username,
  password: url.password,
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
};

const client = new Client(config);

async function verify() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check if tables exist
    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    console.log(`✓ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`  - ${t.tablename}`));

    // Check user_roles
    console.log('\n✓ Checking user_roles table:');
    const { rows: roles } = await client.query('SELECT * FROM user_roles;');
    console.log(`  Found ${roles.length} role entries`);
    if (roles.length > 0) {
      roles.forEach(r => console.log(`  - User ${r.user_id.substring(0, 8)}... has role: ${r.role}`));
    }

    // Check profiles
    console.log('\n✓ Checking profiles table:');
    const { rows: profiles } = await client.query('SELECT id, email, full_name, status FROM profiles;');
    console.log(`  Found ${profiles.length} profiles`);
    profiles.forEach(p => console.log(`  - ${p.email}: ${p.full_name} (${p.status})`));

    // Check auth.users
    console.log('\n✓ Checking auth.users table:');
    const { rows: users } = await client.query('SELECT id, email, email_confirmed_at FROM auth.users;');
    console.log(`  Found ${users.length} users`);
    users.forEach(u => console.log(`  - ${u.email}: ${u.email_confirmed_at ? 'confirmed' : 'NOT confirmed'}`));

    console.log('\n✅ Setup verification complete!\n');
    console.log('To login, use:');
    console.log('  Email: colabnation@gmail.in');
    console.log('  Password: 54321');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

verify();
