import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const loadEnvFileIfExist = file => {
  if (existsSync(file)) loadEnvFile(file);
};

loadEnvFileIfExist('./.env');
loadEnvFileIfExist('./.env.local');
loadEnvFileIfExist('./.env-local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables.',
  );
  console.log('Please ensure these are set in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  const email = 'admin@adoptaninmate.org';
  const password = 'St@y0ut!';

  console.log(`Checking for admin user: ${email}...`);

  // Check if user already exists
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  const existingAdmin = users.find(u => u.email === email);

  if (existingAdmin) {
    console.log('Admin user already exists. Updating password and metadata...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingAdmin.id,
      {
        password,
        user_metadata: { onboarding_complete: true },
        email_confirm: true,
      },
    );
    if (updateError) {
      console.error('Error updating admin user:', updateError.message);
      process.exit(1);
    }
    console.log('Admin user updated successfully!');
  } else {
    console.log('Creating new admin user...');
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { onboarding_complete: true },
    });

    if (createError) {
      console.error('Error creating admin user:', createError.message);
      process.exit(1);
    }
    console.log('Admin user created successfully!');
  }
}

createAdmin().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
