# Troubleshooting Guide

## Issue: Login Not Working

### Symptoms
- Can't log in even with correct credentials
- Stays on `/auth` page after clicking sign in
- No error messages displayed

### Solutions

#### 1. Clear Browser Storage
The Vite dev environment may not persist sessions properly. Try:
```bash
# In browser DevTools (F12):
- Go to Application → Local Storage
- Find "http://localhost:5000" 
- Click "Clear All"
- Reload the page
- Try login again
```

#### 2. Check Supabase Connection
Verify Supabase is connected:
```bash
# Run verification script
node --env-file-if-exists=/vercel/share/.env.project verify-setup.mjs

# Should show:
# ✓ Connected to database
# ✓ Found 10 tables
# ✓ Auth users found
```

#### 3. Verify Credentials
The default super admin credentials are:
- **Email**: `colabnation@gmail.in`
- **Password**: `54321`

If these don't work, recreate them:
```bash
# Open browser console (F12) on /auth?bootstrap=true page
# Click "Bootstrap super admin" button
# Should show: "Super admin ready: colabnation@gmail.in / 54321"
```

#### 4. Check Environment Variables
In project Settings → Vars, ensure these are set:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Issue: "Could not find the table" Error

### Symptoms
- Error when clicking Bootstrap or Sign In
- Message like: "Could not find the table 'public.user_roles'"

### Solutions

#### 1. Verify Migrations Were Applied
```bash
node --env-file-if-exists=/vercel/share/.env.project verify-setup.mjs
```

If it shows "✓ Found 10 tables", migrations are applied.

#### 2. Re-Apply Migrations
If tables are missing:
```bash
node --env-file-if-exists=/vercel/share/.env.project apply-migrations.mjs
```

Should output:
```
Found 8 migration files
Applying: 20260707212827_...
✓ Success
...
All migrations processed!
```

#### 3. Check Database Connection
```bash
# Test the database URL
POSTGRES_PRISMA_URL=$(cat /vercel/share/.env.project | grep POSTGRES_PRISMA_URL | cut -d= -f2 | tr -d "'")
echo "Database URL: $POSTGRES_PRISMA_URL"

# If URL is malformed or doesn't connect, Supabase integration may not be configured
```

## Issue: "Unauthorized" or "Invalid Token"

### Symptoms
- Login fails with auth error
- Can't access protected pages
- API requests return 401

### Solutions

#### 1. Verify User Exists
```bash
node --env-file-if-exists=/vercel/share/.env.project -e "
import pg from 'pg';
const { Client } = pg;
const url = new URL(process.env.POSTGRES_PRISMA_URL);
const client = new Client({ user: url.username, password: url.password, host: url.hostname, port: url.port, database: url.pathname.slice(1), ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(\"SELECT * FROM auth.users WHERE email = 'colabnation@gmail.in';\");
console.log('User:', rows[0]);
await client.end();
"
```

#### 2. Verify User Has Super Admin Role
```bash
node --env-file-if-exists=/vercel/share/.env.project -e "
import pg from 'pg';
const { Client } = pg;
const url = new URL(process.env.POSTGRES_PRISMA_URL);
const client = new Client({ user: url.username, password: url.password, host: url.hostname, port: url.port, database: url.pathname.slice(1), ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(\"SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'colabnation@gmail.in');\");
console.log('Roles:', rows);
await client.end();
"
```

Should show role `super_admin`.

## Issue: Email Verification Required

### Symptoms
- After signing up, can't log in
- Message: "Please verify your email first"
- Redirected to `/verify-email` page

### Solution
This is expected behavior. In CoLab Nexus:
1. Users apply at `/register`
2. Email is auto-confirmed (no email verification needed for registered emails)
3. Admin must approve in `/admin/applications`
4. After approval, user can log in

To create test users quickly, use the super admin bootstrap:
```bash
# Visit /auth?bootstrap=true
# Click "Bootstrap super admin" 
# Login with those credentials
```

## Issue: Application Not Loading

### Symptoms
- Page shows blank white screen
- No errors in console
- Infinite loading

### Solutions

#### 1. Check Dev Server is Running
```bash
# Terminal should show:
# ✓ VITE v8.1.3 ready in ... ms
# ➜  Local:   http://localhost:5000/
```

If not, restart:
```bash
npm run dev
```

#### 2. Clear Vite Cache
```bash
rm -rf node_modules/.vite
npm run dev
```

#### 3. Check for TypeScript Errors
```bash
# Check for compile errors
npm run build
```

## Issue: RLS (Row Level Security) Errors

### Symptoms
- Can see data when logged in as super admin
- Regular users get "permission denied" errors
- `SELECT permission denied for table X`

### Solution
This is expected security behavior. RLS policies control who can see what data:
- **Super Admin**: Can see everything
- **Department Heads**: Can see their department's data
- **Members**: Can only see their own data and public announcements

To debug RLS issues, check the policies:
```sql
-- In Supabase SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'applications';
```

## Need More Help?

1. Check the logs: `F12 → Console` in browser
2. Run verify script: `node verify-setup.mjs`
3. Check Supabase dashboard at https://supabase.com/dashboard
4. Review `FIX_SUMMARY.md` for what was fixed
5. Review `SETUP.md` for initial configuration

## Success Indicators

✅ You should see:
- Database tables created (10 total)
- Super admin user in auth.users
- Super admin role in user_roles
- Profile entry for the admin
- Can log in to dashboard
- Can see /admin/applications and /admin/team pages

Once these are all confirmed, your CoLab Nexus workspace is ready to use!
