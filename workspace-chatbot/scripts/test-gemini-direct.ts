import * as fs from 'fs';
import * as path from 'path';

// Load env
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
} catch (e) {}

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../lib/supabase';
import { embedQuery } from '../lib/embeddings';
import { retrieve, buildContext } from '../lib/rag';
import { generate } from '../lib/gemini';
import { SYSTEM_INSTRUCTION } from '../lib/rag';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = getSupabaseAdmin();

  console.log('Logging in test user...');
  const supabase = createClient(url, anonKey);
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'grader-test-unique5@gmail.com',
    password: 'GraderPass123!'
  });

  const userId = session!.user.id;
  const { data: wsAList } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', 'Workspace A')
    .limit(1);
  const workspaceId = wsAList![0].id;

  console.log('Embedding query...');
  const embedding = await embedQuery('What is the capital of Zinnia?');
  const chunks = await retrieve(workspaceId, embedding);
  const context = buildContext(chunks);

  console.log('\nSending direct query to Gemini API with full context...');
  console.log('Context characters count:', context.length);
  
  const start = Date.now();
  try {
    const res = await generate({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [
        {
          role: 'user',
          parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION: What is the capital of Zinnia?` }]
        }
      ]
    });
    console.log(`Success! Time taken: ${((Date.now() - start) / 1000).toFixed(2)}s`);
    console.log('Answer:', res.text);
  } catch (err) {
    console.error(`Failed! Time taken: ${((Date.now() - start) / 1000).toFixed(2)}s`);
    console.error('Error:', err);
  }
}

main();
