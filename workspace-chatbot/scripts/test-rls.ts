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

import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const workspaceId = '275fc97e-3265-4455-90c6-28891914734f'; // Workspace B ID from browser test

  console.log('Initializing client and logging in...');
  const supabase = createClient(url, anonKey);

  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'grader-test-unique5@gmail.com',
    password: 'GraderPass123!'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr);
    return;
  }

  console.log('Logged in successfully. Testing RLS UPDATE (Rename)...');

  // Test RLS update policy
  const { data: renameData, error: renameError } = await supabase
    .from('workspaces')
    .update({ name: 'Workspace C' })
    .eq('id', workspaceId)
    .select();

  if (renameError) {
    console.error('Rename failed (RLS error):', renameError);
  } else {
    console.log('Rename succeeded. Response data:', renameData);
  }

  console.log('Testing RLS DELETE...');

  // Test RLS delete policy
  const { error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (deleteError) {
    console.error('Delete failed (RLS error):', deleteError);
  } else {
    console.log('Delete succeeded.');
  }
}

main();
