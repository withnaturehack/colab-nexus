import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = 'colabnation@gmail.in';
const password = 'ColabNation@12345';

try {
  const { data: list } = await (supabase.auth.admin).listUsers({ page: 1, perPage: 200 });
  const user = list?.users?.find(u => u.email === email);
  
  if (!user) {
    console.log('User not found, creating new one...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'CoLab Nation Admin' }
    });
    if (error) throw error;
    console.log('✓ User created with ID:', data.user.id);
  } else {
    console.log('User found, updating password...');
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true
    });
    if (error) throw error;
    console.log('✓ Password updated successfully');
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
