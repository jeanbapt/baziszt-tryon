# Runway Gen-3 Animation Sequence for VTO Results

## Concept: Multi-Clip Choreography
Break the animation into 5 short scenes, each 5-8 seconds. Concatenate into ~30-second catwalk video.

---

## Clip 1: The Smile (5 sec)
**Prompt:**
```
Close-up of model's face, wearing white shirt and leather jacket. 
Model smiles warmly at the camera, eyes engaging, natural expression. 
Soft studio lighting, white background. High fashion editorial.
```

**Technical:**
- Input: VTO composite image
- Duration: 5 sec
- Focus: Facial expression, eye contact
- Cost: ~$0.15

---

## Clip 2: The Laugh (5 sec)
**Prompt:**
```
Close-up of model's face, wearing white shirt and leather jacket.
Model laughs joyfully, head tilts slightly, genuine joy. 
Natural head movement, eyes crinkling with laughter.
Soft studio lighting, white background. High fashion editorial.
```

**Technical:**
- Input: VTO composite image (same as Clip 1)
- Duration: 5 sec
- Focus: Genuine emotion, head movement
- Cost: ~$0.15

---

## Clip 3: The Serious (5 sec)
**Prompt:**
```
Close-up of model's face, wearing white shirt and leather jacket.
Model looks directly at camera with a serious, intense expression.
Sharp jawline, confident gaze, serious demeanor. 
Soft studio lighting, white background. High fashion editorial.
```

**Technical:**
- Input: VTO composite image
- Duration: 5 sec
- Focus: Intensity, confidence
- Cost: ~$0.15

---

## Clip 4: Catwalk Walk (8 sec)
**Prompt:**
```
Full body shot of model wearing white shirt and leather jacket, walking toward camera on a white studio backdrop.
Model walks confidently down a catwalk, shoulders back, posture strong.
Outfit moves naturally, leather jacket drapes elegantly, fabric flows realistically.
Professional fashion runway video. Cinematic lighting.
```

**Technical:**
- Input: VTO composite image
- Duration: 8 sec
- Focus: Full-body movement, fabric drape
- Cost: ~$0.20

---

## Clip 5: Turn & Arms (7 sec)
**Prompt:**
```
Full body shot of model wearing white shirt and leather jacket.
Model walks from left to right, then turns around to face camera.
Model raises arms slightly, showing jacket movement and fit.
Leather jacket movement is natural and realistic. White shirt drapes beautifully.
Professional fashion show lighting, white background. Cinematic.
```

**Technical:**
- Input: VTO composite image
- Duration: 7 sec
- Focus: Turning motion, arm gesture, jacket movement
- Cost: ~$0.20

---

## Total Animation Stats

| Metric | Value |
|--------|-------|
| **Total Duration** | ~30 seconds |
| **Number of Clips** | 5 |
| **Cost per Animation** | ~$0.75 (5 clips × ~$0.15 avg) |
| **Generation Time** | ~20-25 min (5 clips × 4-5 min each) |
| **Editing Required** | Concatenate clips with ffmpeg |

---

## Implementation Workflow

### Step 1: Generate Each Clip
```bash
curl -X POST https://api.runwayml.com/v1/image_to_video \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -d '{
    "image_url": "<VTO composite URL>",
    "prompt": "<clip prompt>",
    "model": "gen3",
    "duration": 5,  # or 8, 7 depending on clip
    "seed": <random>
  }'
```

### Step 2: Wait for Completion
Poll the `task_id` returned from each request until status = "completed"

### Step 3: Download MP4 Files
```
clip1.mp4 (5 sec)
clip2.mp4 (5 sec)
clip3.mp4 (5 sec)
clip4.mp4 (8 sec)
clip5.mp4 (7 sec)
```

### Step 4: Concatenate with ffmpeg
```bash
ffmpeg -f concat -safe 0 -i playlist.txt -c copy final_animation.mp4
```

Where `playlist.txt`:
```
file 'clip1.mp4'
file 'clip2.mp4'
file 'clip3.mp4'
file 'clip4.mp4'
file 'clip5.mp4'
```

### Step 5: Serve Result
Save final video to `/results/vto_animation_<timestamp>.mp4`
Return to frontend

---

## Runway Gen-3 API Notes

**Base URL:** `https://api.runwayml.com/v1`

**Authentication:** `Authorization: Bearer <RUNWAY_API_KEY>`

**Endpoint:** `POST /image_to_video`

**Required Fields:**
- `image_url` — input VTO composite
- `prompt` — motion description
- `model` — "gen3" for latest
- `duration` — 5-60 seconds

**Response:**
```json
{
  "id": "task_abc123...",
  "status": "queued",
  "created_at": "2026-06-01T...",
  "task_id": "task_abc123..."
}
```

**Poll Status:**
```
GET /tasks/{task_id}
→ status: "processing" | "completed" | "failed"
```

**Get Result:**
When completed:
```json
{
  "video": {
    "url": "https://..../output.mp4",
    "duration": 5.2,
    "dimensions": [1280, 1024]
  }
}
```

---

## Next: Integration Steps

1. ✅ Get Runway API key
2. ⏳ Implement `/api/animate-sequence` endpoint in server.js
3. ⏳ Add "Animate this look" button to UI
4. ⏳ Generate 5 clips in parallel (Runway allows concurrent requests)
5. ⏳ Concatenate & serve final video
6. ⏳ Deploy to Koyeb
