import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts
          .slice(1)
          .join('=')
          .trim()
          .replace(/(^['"]|['"]$)/g, '');
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
import { sha256Hex } from '../lib/hash';
import { embedDocument } from '../lib/embeddings';

const EMAIL = 'grader-test-unique5@gmail.com';
const PASSWORD = 'GraderPass123!';

interface SeedDoc {
  filename: string;
  content: string;
}

const WORKSPACE_A_DOCS: SeedDoc[] = [
  {
    filename: 'zinnia_fact.txt',
    content: 'The capital of Zinnia is FlowerCity. It is famous for its colorful gardens.',
  },
  {
    filename: 'ProjectCodeTest.txt',
    content: 'the project code for operation johncena is 91',
  },
];

const WORKSPACE_B_DOCS: SeedDoc[] = [
  {
    filename: 'other_fact.txt',
    content: 'The capital of Tulipia is RedCity. It is famous for its vast tulip fields.',
  },
];

function generateDummyEmbedding(): number[] {
  // Unit vector where first component is 1 and all others are 0
  // Length is 768, L2 norm is exactly 1.0 (pgvector cosine-ops friendly)
  const vec = new Array(768).fill(0);
  vec[0] = 1;
  return vec;
}

async function seedWorkspace(
  admin: ReturnType<typeof getSupabaseAdmin>,
  workspaceId: string,
  docs: SeedDoc[]
) {
  for (const doc of docs) {
    console.log(`  Ingesting document: ${doc.filename}...`);
    const contentHash = sha256Hex(Buffer.from(doc.content, 'utf-8'));

    // 1. Delete pre-existing document to avoid conflict / duplicate key errors
    const { data: existingDoc } = await admin
      .from('documents')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('filename', doc.filename)
      .maybeSingle();

    if (existingDoc) {
      console.log(`    Deleting pre-existing document: ${doc.filename} (ID: ${existingDoc.id})`);
      await admin.from('documents').delete().eq('id', existingDoc.id);
    }

    // 2. Insert new document
    const { data: insertedDoc, error: docError } = await admin
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        filename: doc.filename,
        content_hash: contentHash,
      })
      .select('id')
      .single();

    if (docError) {
      throw new Error(`Failed to insert document ${doc.filename}: ${docError.message}`);
    }

    // 3. Generate embeddings
    let embeddings: number[][];
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
      try {
        console.log(`    Generating real Gemini embedding for: ${doc.filename}`);
        embeddings = await embedDocument([doc.content]);
      } catch (embErr) {
        console.warn(`    Failed to call Gemini API: ${embErr instanceof Error ? embErr.message : String(embErr)}. Falling back to dummy vectors.`);
        embeddings = [generateDummyEmbedding()];
      }
    } else {
      console.log(`    No GEMINI_API_KEY configured. Seeding dummy normalized vector.`);
      embeddings = [generateDummyEmbedding()];
    }

    // 4. Insert chunk
    const { error: chunkError } = await admin.from('chunks').insert({
      workspace_id: workspaceId,
      document_id: insertedDoc.id,
      chunk_index: 0,
      content: doc.content,
      embedding: JSON.stringify(embeddings[0]),
    });

    if (chunkError) {
      throw new Error(`Failed to insert chunk for ${doc.filename}: ${chunkError.message}`);
    }

    console.log(`    Successfully seeded: ${doc.filename} with chunk index 0.`);
  }
}

async function main() {
  const admin = getSupabaseAdmin();

  console.log(`Step 1: Finding or creating test user: ${EMAIL}...`);
  let userId = '';
  try {
    const {
      data: { users },
      error: listError,
    } = await admin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.find((u) => u.email === EMAIL);
    if (existingUser) {
      userId = existingUser.id;
      console.log(`  Found existing user (ID: ${userId}). Confirming email...`);
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (updateError) throw updateError;
    } else {
      console.log(`  User does not exist. Creating confirmed user...`);
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
      });
      if (createError) throw createError;
      userId = newUser.user.id;
      console.log(`  Created confirmed user (ID: ${userId}).`);
    }
  } catch (error) {
    console.error('Failed user provisioning step:', error);
    process.exit(1);
  }

  console.log('\nStep 2: Resolving or creating Workspace A...');
  let workspaceAId = '';
  try {
    const { data: wsAList, error: getAErr } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .eq('name', 'Workspace A')
      .limit(1);
    if (getAErr) throw getAErr;

    if (wsAList && wsAList.length > 0) {
      workspaceAId = wsAList[0].id;
      console.log(`  Workspace A exists (ID: ${workspaceAId})`);
    } else {
      const { data: newWsA, error: createAErr } = await admin
        .from('workspaces')
        .insert({ owner_id: userId, name: 'Workspace A' })
        .select('id')
        .single();
      if (createAErr) throw createAErr;
      workspaceAId = newWsA.id;
      console.log(`  Created Workspace A (ID: ${workspaceAId})`);
    }
  } catch (error) {
    console.error('Failed Workspace A setup:', error);
    process.exit(1);
  }

  console.log('\nStep 3: Resolving or creating Workspace B...');
  let workspaceBId = '';
  try {
    const { data: wsBList, error: getBErr } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .eq('name', 'Workspace B')
      .limit(1);
    if (getBErr) throw getBErr;

    if (wsBList && wsBList.length > 0) {
      workspaceBId = wsBList[0].id;
      console.log(`  Workspace B exists (ID: ${workspaceBId})`);
    } else {
      const { data: newWsB, error: createBErr } = await admin
        .from('workspaces')
        .insert({ owner_id: userId, name: 'Workspace B' })
        .select('id')
        .single();
      if (createBErr) throw createBErr;
      workspaceBId = newWsB.id;
      console.log(`  Created Workspace B (ID: ${workspaceBId})`);
    }
  } catch (error) {
    console.error('Failed Workspace B setup:', error);
    process.exit(1);
  }

  console.log('\nStep 4: Seeding data into Workspace A...');
  try {
    await seedWorkspace(admin, workspaceAId, WORKSPACE_A_DOCS);
  } catch (error) {
    console.error('Failed Workspace A seeding:', error);
    process.exit(1);
  }

  console.log('\nStep 5: Seeding data into Workspace B...');
  try {
    await seedWorkspace(admin, workspaceBId, WORKSPACE_B_DOCS);
  } catch (error) {
    console.error('Failed Workspace B seeding:', error);
    process.exit(1);
  }

  console.log('\nSeeding successfully completed!');
  console.log(`Test user email: ${EMAIL}`);
  console.log(`Test user password: ${PASSWORD}`);
}

main();
