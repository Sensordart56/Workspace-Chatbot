import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn('Failed to load .env.local:', e);
}

import { getSupabaseAdmin } from '../lib/supabase';

async function main() {
  // Load env vars manually if running directly
  const supabase = getSupabaseAdmin();
  const email = 'grader-test-unique5@gmail.com';
  const password = 'GraderPass123!';

  console.log(`Checking user: ${email}...`);

  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      console.log(`User exists (ID: ${existingUser.id}). Confirming email...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );
      if (updateError) throw updateError;
      console.log('User confirmed successfully.');
    } else {
      console.log(`User does not exist. Creating confirmed user...`);
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createError) throw createError;
      console.log('User created and confirmed successfully.');
    }
  } catch (error) {
    console.error('Error in confirm-user script:', error);
  }
}

main();
