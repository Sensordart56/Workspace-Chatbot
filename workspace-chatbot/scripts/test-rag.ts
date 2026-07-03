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
import { getSupabaseAdmin } from '../lib/supabase';
import { ingestDocument } from '../lib/ingest';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = getSupabaseAdmin();

  console.log('Logging in test user...');
  const supabase = createClient(url, anonKey);
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'grader-test-unique5@gmail.com',
    password: 'GraderPass123!'
  });

  if (loginErr || !session) {
    console.error('Login failed:', loginErr || 'Session is null');
    return;
  }

  const userId = session.user.id;
  console.log(`Logged in successfully. User ID: ${userId}`);

  // 1. Resolve or Create Workspace A
  console.log('\nResolving Workspace A...');
  let workspaceAId = '';
  const { data: wsAList } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', 'Workspace A')
    .limit(1);

  if (wsAList && wsAList.length > 0) {
    workspaceAId = wsAList[0].id;
    console.log(`Found Workspace A (ID: ${workspaceAId})`);
  } else {
    const { data: newWsA, error: newWsAErr } = await admin
      .from('workspaces')
      .insert({ owner_id: userId, name: 'Workspace A' })
      .select('id')
      .single();
    if (newWsAErr) throw newWsAErr;
    workspaceAId = newWsA.id;
    console.log(`Created Workspace A (ID: ${workspaceAId})`);
  }

  // 2. Resolve or Create Workspace B
  console.log('\nResolving Workspace B...');
  let workspaceBId = '';
  const { data: wsBList } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('name', 'Workspace B')
    .limit(1);

  if (wsBList && wsBList.length > 0) {
    workspaceBId = wsBList[0].id;
    console.log(`Found Workspace B (ID: ${workspaceBId})`);
  } else {
    const { data: newWsB, error: newWsBErr } = await admin
      .from('workspaces')
      .insert({ owner_id: userId, name: 'Workspace B' })
      .select('id')
      .single();
    if (newWsBErr) throw newWsBErr;
    workspaceBId = newWsB.id;
    console.log(`Created Workspace B (ID: ${workspaceBId})`);
  }

  // 3. Clear existing chat history to start clean
  console.log('\nCleaning existing chat history for both workspaces...');
  await admin.from('chat_messages').delete().in('workspace_id', [workspaceAId, workspaceBId]);

  // 4. Ingest Zinnia fact into Workspace A
  console.log('\nIngesting Zinnia fact document into Workspace A...');
  const factContent = 'The capital of Zinnia is FlowerCity. It is famous for its colorful gardens.';
  const bytes = Buffer.from(factContent, 'utf-8');
  
  // Clean pre-existing doc in Workspace A
  const { sha256Hex } = await import('../lib/hash');
  const factHash = sha256Hex(bytes);
  await admin.from('documents').delete().eq('workspace_id', workspaceAId).eq('content_hash', factHash);

  const ingestRes = await ingestDocument({
    workspaceId: workspaceAId,
    filename: 'zinnia_fact.txt',
    bytes,
    ext: 'txt'
  });
  console.log('Ingestion completed:', ingestRes);

  console.log('Sleeping 5 seconds to clear API rate limit window...');
  await new Promise((r) => setTimeout(r, 5000));

  // Helper to call `/api/chat` using native fetch and passing auth cookie
  async function callChatApi(workspaceId: string, message: string): Promise<any> {
    const projectRef = url.split('//')[1].split('.')[0];
    const sessionString = JSON.stringify(session);
    const base64Session = Buffer.from(sessionString).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const cookieHeader = `sb-${projectRef}-auth-token=base64-${base64Session}`;

    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({ workspaceId, message })
    });
    
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Chat API error (status ${res.status}): ${text}`);
    }
    return JSON.parse(text);
  }

  // Helper to fetch chat history
  async function callChatHistoryApi(workspaceId: string): Promise<any> {
    const projectRef = url.split('//')[1].split('.')[0];
    const sessionString = JSON.stringify(session);
    const base64Session = Buffer.from(sessionString).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const cookieHeader = `sb-${projectRef}-auth-token=base64-${base64Session}`;

    const res = await fetch(`http://localhost:3000/api/chat/history?workspaceId=${workspaceId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader
      }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`History API error (status ${res.status}): ${text}`);
    }
    return JSON.parse(text);
  }

  // Helper to fetch documents
  async function callDocumentsApi(workspaceId: string): Promise<any> {
    const projectRef = url.split('//')[1].split('.')[0];
    const sessionString = JSON.stringify(session);
    const base64Session = Buffer.from(sessionString).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const cookieHeader = `sb-${projectRef}-auth-token=base64-${base64Session}`;

    const res = await fetch(`http://localhost:3000/api/documents?workspaceId=${workspaceId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader
      }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Documents API error (status ${res.status}): ${text}`);
    }
    return JSON.parse(text);
  }

  // Test 1: Grounded retrieval in Workspace A
  console.log('\n--- RAG Test 1: Querying Zinnia capital in Workspace A ---');
  try {
    const chatRes = await callChatApi(workspaceAId, 'What is the capital of Zinnia?');
    console.log('Response:', chatRes);

    const hasFlowerCity = chatRes.answer.toLowerCase().includes('flowercity');
    const hasCitation = chatRes.citations && chatRes.citations.length > 0;
    const hasRetrieval = chatRes.retrieval && chatRes.retrieval.chunks.length > 0;

    if (hasFlowerCity && hasCitation && hasRetrieval) {
      console.log('RAG Test 1 PASSED: Grounded retrieval returned FlowerCity and correct citation details.');
    } else {
      console.error('RAG Test 1 FAILED: Mismatch in grounded check results.');
    }
  } catch (err) {
    console.error('RAG Test 1 FAILED with error:', err);
  }

  // Test 2: Grounded refusal in Workspace B (Isolation boundary test)
  console.log('\n--- RAG Test 2: Querying Zinnia capital in Workspace B (Isolated Workspace) ---');
  try {
    const chatRes = await callChatApi(workspaceBId, 'What is the capital of Zinnia?');
    console.log('Response:', chatRes);

    const isRefusal = 
      chatRes.answer.toLowerCase().includes("don't know") || 
      chatRes.answer.toLowerCase().includes("do not know") ||
      chatRes.answer.toLowerCase().includes("no information") ||
      chatRes.answer.toLowerCase().includes("do not have") ||
      chatRes.answer.toLowerCase().includes("don't have");
    const hasZeroCitations = !chatRes.citations || chatRes.citations.length === 0;
    const hasZeroRetrieval = chatRes.retrieval && chatRes.retrieval.chunks.length === 0;

    if (isRefusal && hasZeroCitations && hasZeroRetrieval) {
      console.log('RAG Test 2 PASSED: Grounded refusal occurred and Workspace B did NOT leak Workspace A facts.');
    } else {
      console.error('RAG Test 2 FAILED: Workspace B leaked facts or did not refuse grounded question.');
    }
  } catch (err) {
    console.error('RAG Test 2 FAILED with error:', err);
  }

  // Test 3: Chat history isolation retrieval
  console.log('\n--- RAG Test 3: Fetching and verifying isolated chat history ---');
  try {
    const histA = await callChatHistoryApi(workspaceAId);
    const histB = await callChatHistoryApi(workspaceBId);

    console.log(`Workspace A Chat History Length: ${histA.messages.length}`);
    console.log(`Workspace B Chat History Length: ${histB.messages.length}`);

    const hasAQuery = histA.messages.some((m: any) => m.content.includes('Zinnia') && m.role === 'user');
    const hasBQuery = histB.messages.some((m: any) => m.content.includes('Zinnia') && m.role === 'user');

    if (hasAQuery && hasBQuery && histA.messages.length === 2 && histB.messages.length === 2) {
      console.log('RAG Test 3 PASSED: Chat history loaded successfully and is correctly workspace-separated.');
    } else {
      console.error('RAG Test 3 FAILED: Chronology or separation issue in retrieved histories.');
    }
  } catch (err) {
    console.error('RAG Test 3 FAILED with error:', err);
  }

  // Test 4: Documents list isolation retrieval
  console.log('\n--- RAG Test 4: Fetching and verifying isolated documents list ---');
  try {
    const docsA = await callDocumentsApi(workspaceAId);
    const docsB = await callDocumentsApi(workspaceBId);

    console.log(`Workspace A Documents:`, docsA.documents.map((d: any) => d.filename));
    console.log(`Workspace B Documents:`, docsB.documents.map((d: any) => d.filename));

    const hasFactInA = docsA.documents.some((d: any) => d.filename === 'zinnia_fact.txt');
    const hasFactInB = docsB.documents.some((d: any) => d.filename === 'zinnia_fact.txt');

    if (hasFactInA && !hasFactInB) {
      console.log('RAG Test 4 PASSED: Documents list successfully loaded and isolated per workspace.');
    } else {
      console.error('RAG Test 4 FAILED: Document leaked or not found.');
    }
  } catch (err) {
    console.error('RAG Test 4 FAILED with error:', err);
  }
}

main();
