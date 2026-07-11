# Super Admin Login & Bootstrap Guide

If you are unable to login as a Super Admin in local development, it is because the database is either empty or does not have the admin user configured, and the local `bootstrap` command cannot run without the Supabase Service Role Key.

Here are the two ways to fix this.

---

## Option 1: Run the Bootstrap via SQL Editor (Recommended & Easiest)

Since you already have access to the Supabase dashboard, you can bypass local setup constraints by executing a SQL query directly in the database.

1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor** page:
   [https://supabase.com/dashboard/project/jeopktziiwmikchmrlow/sql](https://supabase.com/dashboard/project/jeopktziiwmikchmrlow/sql)
3. Click **New query** and paste the following SQL script:

```sql
-- SQL script to create and configure the super admin user
DO $$
DECLARE
  v_email TEXT := 'colabnation@gmail.in';
  v_password TEXT := 'ColabNation@12345'; -- The default bootstrap password
  v_user_id UUID;
BEGIN
  -- 1. Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"CoLab Nation Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    -- Update password and confirm email
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = '{"full_name":"CoLab Nation Admin"}'
    WHERE id = v_user_id;
  END IF;

  -- 2. Upsert into public.profiles
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (v_user_id, v_email, 'CoLab Nation Admin', 'active')
  ON CONFLICT (id) DO UPDATE
  SET status = 'active', email = v_email, full_name = 'CoLab Nation Admin';

  -- 3. Grant super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super admin configuration complete for %', v_email;
END $$;
```

4. Click **Run**.
5. Go back to [http://localhost:5000/auth](http://localhost:5000/auth) and sign in using:
   - **Email**: `colabnation@gmail.in`
   - **Password**: `ColabNation@12345`

---

## Option 2: Enable the Local "Bootstrap" Button

The "Bootstrap super admin" button fails locally because the server does not have the `SUPABASE_SERVICE_ROLE_KEY` to bypass Row Level Security (RLS).

To enable it:

1. Open your **Supabase Dashboard**.
2. Go to **Settings** -> **API**.
3. Find the **service_role** key (it starts with `eyJ...` and is labeled as "secret"). Copy it.
4. Open the `.env` file in the root of your project:
   [colab-nexus/.env](file:///n:/colab-nexus/.env)
5. Add the copied key to the bottom of the file:
   ```env
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   ```
6. Restart your dev server.
7. Visit [http://localhost:5000/auth?bootstrap=true](http://localhost:5000/auth?bootstrap=true).
8. Click the **Bootstrap super admin** button at the bottom of the form.
9. Click **Sign in**.
