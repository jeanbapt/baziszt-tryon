#!/usr/bin/env node
/**
 * Test the /api/animate-sequence endpoint
 *
 * Usage:
 *   node tests/animate-endpoint.js <image_url>
 *
 * Example:
 *   node tests/animate-endpoint.js https://example.com/outfit.jpg
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

// Load .env
dotenv.config({ path: join(root, '.env') });

const SERVER = process.env.SERVER_URL || 'http://localhost:8000';
const imageUrl = process.argv[2];

if (!imageUrl) {
  console.error('❌ Usage: node tests/animate-endpoint.js <image_url>');
  console.error('\nExample:');
  console.error('  node tests/animate-endpoint.js https://example.com/outfit.jpg');
  process.exit(1);
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  Animate-Sequence Endpoint Test          ║');
console.log('╚════════════════════════════════════════════╝');

console.log(`\n📍 Server: ${SERVER}`);
console.log(`🖼️  Image:  ${imageUrl.slice(0, 60)}...`);

// ─────────────────────────────────────────────────────────────────
// Step 1: Submit animation job
// ─────────────────────────────────────────────────────────────────
console.log('\n[1/2] Submitting animation job...');

try {
  const submitRes = await fetch(`${SERVER}/api/animate-sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl })
  });

  if (!submitRes.ok) {
    const error = await submitRes.text();
    throw new Error(`${submitRes.status}: ${error}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.job_id;

  console.log(`✅ Job submitted`);
  console.log(`   Job ID: ${jobId}`);

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Poll for completion
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[2/2] Polling for completion...');
  console.log('   (This will take 10-15 minutes for all 5 clips)');

  let completed = false;
  let lastStatus = null;

  for (let i = 0; i < 600; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(`${SERVER}/api/job?id=${jobId}`);
    const statusData = await statusRes.json();

    if (statusData.status !== lastStatus) {
      lastStatus = statusData.status;

      if (statusData.clips) {
        const clipStatuses = statusData.clips
          .map(c => `${c.name}=${c.status === 'failed' ? '❌' : c.video_url ? '✅' : '⏳'}`)
          .join(', ');
        console.log(`   [${i * 3}s] ${statusData.status.toUpperCase()} - ${clipStatuses}`);
      } else {
        console.log(`   [${i * 3}s] ${statusData.status.toUpperCase()}`);
      }
    }

    if (statusData.ok && statusData.status === 'ready') {
      completed = true;
      console.log('\n✅ Animation sequence generated!');
      console.log(`   Total clips: ${statusData.clips?.length || 0}`);
      console.log(`   Total duration: ${statusData.total_duration || '?'}s`);

      if (statusData.video_urls) {
        console.log('\n   Video clips:');
        statusData.video_urls.forEach((url, i) => {
          console.log(`     [${i+1}] ${url.slice(0, 80)}...`);
        });
      }

      console.log('\n✨ Next step: Integrate with frontend UI');
      console.log('   UI should show: "Animate this look" button');
      console.log('   Then display video player with generated MP4');
      break;
    }

    if (statusData.status === 'failed') {
      console.error('\n❌ Animation job failed');
      if (statusData.error) console.error(`   Error: ${statusData.error}`);
      if (statusData.clips) {
        const failed = statusData.clips.filter(c => c.status === 'failed');
        failed.forEach(c => {
          console.error(`   - ${c.name}: ${c.error || 'unknown error'}`);
        });
      }
      break;
    }
  }

  if (!completed) {
    console.error('\n⏱️  Polling timeout');
    console.log('   Run this command to check status:');
    console.log(`   curl ${SERVER}/api/job?id=${jobId}`);
  }

} catch (e) {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
}

console.log();
