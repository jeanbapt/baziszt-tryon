# Animation Feature Implementation

## Overview
Generate animated videos of VTO outfits using Runway Gen-3 AI model. Takes a static VTO composite image and produces a 30-second video showing the model with different facial expressions and catwalk movements.

---

## Architecture

### API Endpoint
```
POST /api/animate-sequence
Content-Type: application/json

Request:
{
  "image_url": "https://example.com/vto_outfit.jpg"
}

Response:
{
  "ok": true,
  "job_id": "anim_1780220051758_zac2x2"
}
```

### Job Status
```
GET /api/job?id=anim_1780220051758_zac2x2

Response (pending):
{
  "status": "pending",
  "clips": [
    { "name": "smile", "status": "processing", "task_id": "..." },
    { "name": "laugh", "status": "queued" },
    ...
  ]
}

Response (ready):
{
  "ok": true,
  "status": "ready",
  "clips": [
    { "name": "smile", "video_url": "https://...mp4", "status": "succeeded" },
    ...
  ],
  "video_urls": ["https://...clip1.mp4", "https://...clip2.mp4", ...],
  "total_duration": 30
}
```

---

## Sequence Specification

| Clip | Duration | Prompt | Technical Notes |
|------|----------|--------|-----------------|
| **Smile** | 5s | Close-up, warm smile, eye contact | Facial expression |
| **Laugh** | 5s | Close-up, joyful laugh, head movement | Emotion + motion |
| **Serious** | 5s | Close-up, intense expression, confident gaze | Intensity |
| **Catwalk** | 8s | Full body, walking toward camera, confident posture | Full-body motion, fabric drape |
| **Turn & Arms** | 7s | Full body, walk left→right, turn around, arm gesture | Rotation, jacket movement |

**Total:** 30 seconds of video per animation  
**Cost:** ~$0.75 per animation (5 clips × ~$0.15 each)  
**Generation time:** 10-15 minutes (parallel processing)

---

## Implementation Details

### Backend (server.js)

#### 1. Runway API Integration
```javascript
const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
const GEN3_API_KEY = process.env.GEN3_API_KEY;

async function runwayRequest(endpoint, payload) {
  // Posts to Runway Gen-3 API with:
  // - Authorization: Bearer <GEN3_API_KEY>
  // - X-Runway-Version: 2024-11 (required header)
  // - Model: gen3
  // - Input: image_url + prompt + duration
}
```

#### 2. Parallel Clip Generation
```javascript
// Generate all 5 clips simultaneously
const clipPromises = animationSequence.map(clip =>
  runwayRequest('image_to_video', {
    model: 'gen3',
    image_url: imageUrl,
    prompt: clip.prompt,
    duration: clip.duration
  })
);

const clips = await Promise.all(clipPromises);
```

#### 3. Task Polling
```javascript
async function runwayPoll(taskId) {
  // Polls every 2 seconds until status = "succeeded" or "failed"
  // Returns video URL when ready
}
```

#### 4. Job Tracking
```javascript
jobs.set(jobId, {
  status: 'pending',
  clips: [
    { name: 'smile', task_id: 'rwytask_...', status: 'processing' },
    ...
  ]
});

// Updated when clips complete
jobs.set(jobId, {
  status: 'ready',
  clips: [
    { name: 'smile', video_url: 'https://...', status: 'succeeded' },
    ...
  ],
  video_urls: ['https://...', ...],
  total_duration: 30
});
```

---

## Environment Setup

### 1. Get Runway API Key
- Go to https://devrunwayml.com/api/dashboard
- Create new API key (format: `key_...`)
- Copy full key

### 2. Add to .env
```bash
GEN3_API_KEY=key_8bfebc52...
```

### 3. Verify
```bash
node tests/animation-smoke.js
```

Should output:
```
✅ Runway Gen-3 API ready
✅ 5 animation clips defined (30s total)
✅ ffmpeg available for concatenation
```

---

## Testing

### Smoke Test (Validates API access)
```bash
node tests/animation-smoke.js
```

### End-to-End Test (Generates real animation)
```bash
node tests/animate-endpoint.js "https://example.com/outfit.jpg"
```

This will:
1. Submit 5 clips to Runway Gen-3 in parallel
2. Poll for completion (takes 10-15 min)
3. Display status of each clip
4. Show final video URLs when ready

---

## Deployment on Koyeb

### 1. Add Secret
```bash
koyeb secret create \
  GEN3_API_KEY="key_8bfebc52..."
```

### 2. Deploy
```bash
git add -A
git commit -m "feat: add animation endpoint"
git push
```

The server.js automatically reads `GEN3_API_KEY` from environment.

### 3. Test on Koyeb
```bash
curl -X POST https://your-app.koyeb.app/api/animate-sequence \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/outfit.jpg"}'
```

---

## Frontend Integration (Future)

### 1. Add "Animate" Button
After VTO generation shows result image:
```html
<button id="animateBtn">
  ✨ See it in motion
</button>
```

### 2. Submit to Backend
```javascript
const response = await fetch('/api/animate-sequence', {
  method: 'POST',
  body: JSON.stringify({
    image_url: vtoResultUrl
  })
});

const { job_id } = await response.json();
```

### 3. Poll for Status
```javascript
async function pollAnimation(jobId) {
  for (let i = 0; i < 300; i++) {
    const res = await fetch(`/api/job?id=${jobId}`);
    const data = await res.json();
    
    if (data.ok && data.status === 'ready') {
      // Show video player with data.video_urls
      return data;
    }
    
    if (data.status === 'failed') {
      // Show error
      return null;
    }
    
    // Update progress bar (${clips.filter(c => c.video_url).length}/5)
    await new Promise(r => setTimeout(r, 3000));
  }
}
```

### 4. Display Videos
```javascript
const videos = data.video_urls; // Array of MP4 URLs

// Option A: Autoplay sequence
// Append <video> elements, play sequentially

// Option B: Concatenated single video
// Requires server-side ffmpeg concatenation (future enhancement)

// Option C: Video player with clips
// Show dropdown: "Smile | Laugh | Serious | Catwalk | Turn"
// Play selected clip
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Clips generated in parallel | 5 |
| Time per clip | 2-4 min |
| Total generation time | 10-15 min (due to parallelization) |
| API calls per animation | 5 POST (generate) + 5×N GET (poll) |
| Cost per animation | $0.75 |
| Video file size | ~2-5 MB per clip |
| Supported formats | MP4 (H.264) |
| Quality | 1024×1024 or better |

---

## Error Handling

### Missing GEN3_API_KEY
```
POST /api/animate-sequence
→ 503 Service Unavailable
{
  "ok": false,
  "error": "GEN3_API_KEY not configured"
}
```

### Clip Generation Failed
```
GET /api/job?id=anim_...
→ 200 OK
{
  "status": "failed",
  "error": "1 clips failed",
  "clips": [
    { "name": "smile", "status": "failed", "error": "..." }
  ]
}
```

### Polling Timeout
After 10 minutes with no completion → job marked as failed.

---

## Next Steps

1. ✅ Implement `/api/animate-sequence` endpoint
2. ✅ Parallel clip generation with Runway Gen-3
3. ✅ Job tracking & polling
4. ⏳ Frontend: Add "Animate" button to VTO result
5. ⏳ Video player UI with clip selection
6. ⏳ Optional: Server-side concatenation (ffmpeg)
7. ⏳ Deploy to Koyeb with GEN3_API_KEY secret

---

## Cost Analysis

**Per Animation:**
- 5 clips × ~$0.15 = **$0.75**

**At Scale:**
- 100 animations/month = $75
- 1,000 animations/month = $750
- 10,000 animations/month = $7,500

**Optimization:**
- Cheaper model (future) could reduce to $0.50/animation
- Batch processing would save API overhead
- Caching identical animations would save cost
