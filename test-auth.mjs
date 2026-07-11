import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Testing auth with admin@colabnation.com');

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@colabnation.com',
  password: 'TestPassword@123'
});

if (error) {
  console.error('Login error:', error.message);
} else {
  console.log('✓ Login successful!');
  console.log('User ID:', data.user.id);
  console.log('Session token exists:', !!data.session.access_token);
}
