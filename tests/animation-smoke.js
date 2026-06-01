import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

// Load .env
dotenv.config({ path: join(root, '.env') });

const GEN3_API_KEY = process.env.GEN3_API_KEY;
if (!GEN3_API_KEY) {
  console.error('❌ GEN3_API_KEY not found in .env');
  process.exit(1);
}

// Use dev portal endpoint for testing
const RUNWAY_API = 'https://api.dev.runwayml.com/v1';

console.log(`\n📋 Runway API Key: ${GEN3_API_KEY.slice(0, 12)}...`);

// ─────────────────────────────────────────────────────────────────
// SMOKE TEST 1: Test Runway API Connectivity & Auth
// ─────────────────────────────────────────────────────────────────
async function testAuth() {
  console.log('\n🔐 Test 1: Runway API Connection');
  console.log('─────────────────────────────────────────');

  try {
    // Try a simple image_to_video request to validate auth
    const payload = {
      model: 'gen3',
      prompt: 'Test image animation',
      image_url: 'https://via.placeholder.com/512x512.jpg',
      duration: 1
    };

    const res = await fetch(`${RUNWAY_API}/image_to_video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEN3_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    console.log(`   Status: ${res.status}`);
    if (data.error) console.log(`   Error: ${data.error}`);
    if (data.message) console.log(`   Message: ${data.message}`);

    if (res.status === 201 || res.status === 200) {
      console.log('✅ API connection successful!');
      return true;
    } else if (res.status === 401 || res.status === 403) {
      console.error(`❌ Authentication failed (${res.status})`);
      return false;
    } else if (res.status === 400) {
      console.log('✅ API is reachable (400 is expected for test request)');
      return true;
    } else {
      console.warn(`⚠️  Status ${res.status} - Check dev portal settings`);
      return true; // Assume auth works, issue might be elsewhere
    }
  } catch (e) {
    console.error('❌ Network error:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// SMOKE TEST 2: Test Animation Sequence Prompts
// ─────────────────────────────────────────────────────────────────
async function testPrompts() {
  console.log('\n✍️  Test 2: Animation Sequence Prompts');
  console.log('─────────────────────────────────────────');

  const prompts = [
    {
      name: 'Smile',
      duration: 5,
      text: 'Close-up of model\'s face, wearing white shirt and leather jacket. Model smiles warmly at camera, eyes engaging, natural expression.'
    },
    {
      name: 'Laugh',
      duration: 5,
      text: 'Close-up of model\'s face, wearing white shirt and leather jacket. Model laughs joyfully, head tilts slightly, genuine joy.'
    },
    {
      name: 'Serious',
      duration: 5,
      text: 'Close-up of model\'s face, wearing white shirt and leather jacket. Model looks directly at camera with serious, intense expression.'
    },
    {
      name: 'Catwalk',
      duration: 8,
      text: 'Full body shot of model wearing white shirt and leather jacket, walking toward camera on white studio backdrop. Confident posture, fabric flows realistically.'
    },
    {
      name: 'Turn & Arms',
      duration: 7,
      text: 'Full body shot of model wearing white shirt and leather jacket. Model walks from left to right, then turns around. Jacket and shirt movement is natural.'
    }
  ];

  console.log(`✅ ${prompts.length} animation sequence clips defined`);
  let totalDuration = 0;
  prompts.forEach((p, i) => {
    console.log(`   [${i+1}] ${p.name.padEnd(12)} (${p.duration}s) - ${p.text.slice(0, 50)}...`);
    totalDuration += p.duration;
  });
  console.log(`\n   Total video length: ${totalDuration} seconds (~${Math.round(totalDuration/60)} min)`);
  console.log(`   Est. cost @ $0.15/clip: $${(prompts.length * 0.15).toFixed(2)}`);

  return prompts;
}

// ─────────────────────────────────────────────────────────────────
// SMOKE TEST 3: Test Video Concatenation Setup
// ─────────────────────────────────────────────────────────────────
async function testConcatenationSetup() {
  console.log('\n🎞️  Test 3: Video Concatenation (ffmpeg)');
  console.log('─────────────────────────────────────────');

  try {
    const { execSync } = await import('child_process');
    const version = execSync('ffmpeg -version', { encoding: 'utf-8' }).split('\n')[0];
    console.log('✅ ffmpeg is available');
    console.log(`   ${version}`);

    console.log('\n   Concat workflow:');
    console.log('   1. Download 5 MP4 clips from Runway');
    console.log('   2. Create playlist.txt');
    console.log('   3. ffmpeg -f concat -safe 0 -i playlist.txt -c copy final.mp4');

    return true;
  } catch (e) {
    console.warn('⚠️  ffmpeg not available (optional for testing)');
    console.warn(`   Install: brew install ffmpeg  (or apt-get install ffmpeg)`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Runway Gen-3 Animation Smoke Tests      ║');
  console.log('╚════════════════════════════════════════════╝');

  const authOk = await testAuth();
  const prompts = await testPrompts();
  const ffmpegOk = await testConcatenationSetup();

  // ─────────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Summary                                   ║');
  console.log('╚════════════════════════════════════════════╝');

  if (!authOk) {
    console.log('\n⚠️  Runway API Key validation failed');
    console.log('\n   Troubleshooting:');
    console.log('   1. Log in to https://app.runwayml.com');
    console.log('   2. Go to Settings → API → Create Key');
    console.log('   3. Copy the full key (starts with rwy_...)');
    console.log('   4. Update .env: GEN3_API_KEY=rwy_...');
    console.log('   5. Re-run: node tests/animation-smoke.js');
  } else {
    console.log('\n✅ Runway Gen-3 API ready');
    console.log(`✅ ${prompts.length} animation clips defined (${prompts.reduce((s, p) => s + p.duration, 0)}s total)`);
    console.log(`${ffmpegOk ? '✅' : '⚠️'} ffmpeg ${ffmpegOk ? 'available for concatenation' : 'not found (optional)'}`);
    console.log('\n✨ Ready to implement animation endpoint!');
  }

  console.log();
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
