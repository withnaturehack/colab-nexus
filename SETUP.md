# CoLab Nexus - Setup Guide

## Problem Summary

The Supabase migrations have not been applied to your database yet. The app expects tables like `user_roles`, `profiles`, `applications`, etc. but they don't exist, which causes errors during login and super admin bootstrap.

## Solution

You need to push the migrations from `/supabase/migrations/` to your Supabase project.

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project "hotzrppflvepgfaoxkay"
3. Go to SQL Editor → New Query
4. Copy and paste the SQL from each migration file (in order):
   - `20260707212827_a931b8d6-41cd-4c2f-8d9a-51efed91cf50.sql`
   - `20260707212851_a5dfb412-412d-4da0-a8dc-cc77bcef5623.sql`
   - `20260708013906_36b34d2b-6077-4503-a8bc-a8e907f0d163.sql`
   - `20260709015708_8eb2de66-acbb-4baf-81b2-6a5f715baacb.sql`
   - `20260709083113_4be44d94-284a-435c-bcb7-b0f0e651046c.sql`
   - `20260709083145_094bc70c-6652-4e56-a678-ae5a90a7ad37.sql`
   - `20260710134815_c12a296d-d448-4fca-859c-caf8f11ee0bc.sql`
   - `20260711060000_add_resumes_storage_bucket.sql`
5. Execute each query

### Option 2: Using Supabase CLI (if installed)

```bash
supabase db push
```

## After Migrations are Applied

Once the migrations are complete:

1. Refresh the app: http://localhost:5000/auth?bootstrap=true
2. Click "Bootstrap super admin" button
3. Login with:
   - Email: `colabnation@gmail.in`
   - Password: `54321`
4. You should now be able to access the admin dashboard

## Environment Variables Fixed

The app now correctly handles both Vercel v0 and standard Supabase environment variable names:
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

**Error: "Could not find the table 'public.user_roles'"**
- Migrations haven't been applied yet. Follow the setup steps above.

**Error: "Unauthorized"**
- Check that your Supabase environment variables are correct in Settings → Vars

**Login fails with "Email not confirmed"**
- This happens when a user signs up. Go to admin dashboard and approve the application first.

## Next Steps

After setting up the super admin:

1. Visit `/admin/applications` to manage incoming applications
2. Create additional department heads
3. Invite team members via the Members page
