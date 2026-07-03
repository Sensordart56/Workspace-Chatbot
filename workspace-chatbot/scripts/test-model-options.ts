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

import { GoogleGenAI } from '@google/genai';

async function testModel(modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenAI({ apiKey });
  console.log(`Testing model: ${modelName}...`);
  const start = Date.now();
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Hello, respond with exactly "Model works!" if you hear me.',
    });
    console.log(`[Success] ${modelName} responded in ${((Date.now() - start) / 1000).toFixed(2)}s: ${res.text?.trim()}`);
    return true;
  } catch (err: any) {
    console.error(`[Failed] ${modelName} failed in ${((Date.now() - start) / 1000).toFixed(2)}s. Error:`, err.message || err);
    return false;
  }
}

async function main() {
  const models = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
    'gemini-3.5-flash' // Let's check if the quota error is still there for comparison
  ];

  for (const m of models) {
    await testModel(m);
    console.log('');
  }
}

main();
