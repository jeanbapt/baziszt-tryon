# Animating VTO Results: Model & Library Evaluation

**Goal:** Take static VTO-generated fashion images and animate them into short video sequences showing the garment in motion.

---

## Top Candidates

### 1. **Pruna P-Video Animate** ⭐ (User's suggestion)
- **Type:** Proprietary API (hybrid pricing)
- **Cost:** $0.02/sec (720p), $0.005/sec (draft mode)
- **Input:** Reference image + reference video for motion/pose
- **Output:** MP4 video (5-10 seconds recommended)
- **Speed:** ~10 seconds to generate a 5-sec video
- **Integration:** Simple CLI tool (Python, minimal deps: `httpx`, `python-dotenv`)
- **Quality:** Good motion synthesis; decent fabric preservation

#### Pros:
- ✅ Affordable and predictable pricing
- ✅ Fast inference (10s for 5-sec video = practical for real-time UX)
- ✅ Works well with product shots and studio lighting
- ✅ Minimal setup (just API key + Python)
- ✅ Well-documented

#### Cons:
- ❌ Max 10-15 seconds per video (limits expressiveness)
- ❌ Fabric/texture detail less preserved than research models
- ❌ Requires a "reference video" for motion (extra input from user)
- ❌ Proprietary (reliant on Pruna's service)

#### Fit for Baziszt: **GOOD** — Easy integration, fast, affordable. Downside: requires user to provide reference motion video.

---

### 2. **Mintly** (E-Commerce Optimized)
- **Type:** Proprietary SaaS, e-commerce focused
- **Cost:** $0.17-0.19 per video
- **Output:** 3-5 second ads optimized for catalogs
- **Speed:** Fast, batch-capable
- **Quality:** Exceptional product fidelity (logos, patterns, colors preserved)

#### Pros:
- ✅ Built specifically for fashion/e-commerce
- ✅ Excellent product detail preservation
- ✅ White-background and studio lighting handling (perfect for fashion)
- ✅ Predictable cost per video

#### Cons:
- ❌ Higher cost than Pruna ($0.17+ vs $0.02)
- ❌ Very short videos (3-5 sec)
- ❌ Less creative motion control
- ❌ Less transparent API (SaaS only, no CLI)

#### Fit for Baziszt: **MODERATE** — Excellent for product quality, but expensive and limited motion.

---

### 3. **Stable Diffusion Video + DreamPose** (Open-Source)
- **Type:** Open-source models
- **Cost:** Free (but requires GPU compute)
- **Input:** Static image + pose sequences
- **Output:** Video (length limited by compute)
- **Speed:** Slow (minutes per video on consumer GPU)
- **Quality:** Exceptional fabric/textile fidelity

#### Pros:
- ✅ Free (after infrastructure cost)
- ✅ Can run locally (no API dependency)
- ✅ Best fabric/clothing texture preservation
- ✅ Flexible motion control via pose
- ✅ No vendor lock-in

#### Cons:
- ❌ Slow inference (minutes on GPU)
- ❌ Requires ML infrastructure (GPU, VRAM, model weights)
- ❌ Complex setup (PyTorch, diffusers, pose estimation)
- ❌ Lower temporal smoothness than commercial models

#### Fit for Baziszt: **RESEARCH** — Great for quality exploration, but too slow for real-time UX.

---

### 4. **Runway Gen-3 Alpha** (Highest Quality, Complex)
- **Type:** Proprietary API (per-generation billing)
- **Cost:** Variable (typically $0.07-0.15+ per video)
- **Input:** Text prompts + frame-level camera control
- **Output:** Up to 60 seconds
- **Speed:** 30-120 seconds per generation
- **Quality:** Cinematic, photorealistic motion

#### Pros:
- ✅ Highest motion quality (cinematic)
- ✅ Long videos (up to 60 sec)
- ✅ Frame-accurate camera/motion control via Motion Brush

#### Cons:
- ❌ Expensive and unpredictable pricing
- ❌ Slower inference (1-2 min per video)
- ❌ Complex API with high learning curve
- ❌ Product fidelity inconsistent (sometimes "hallucinates" clothing details)

#### Fit for Baziszt: **EDITORIAL ONLY** — Overkill for product catalog; better for brand campaigns/lookbooks.

---

### 5. **Pose-Based Animation** (MediaPipe + MotionBERT)
- **Type:** Open-source + neural cloth simulation
- **Cost:** Free
- **Input:** Static image + pose sequences (24+ frames)
- **Output:** Video with realistic cloth simulation
- **Speed:** Real-time on modern CPUs (4ms/frame with GraphNeuralCloth)
- **Quality:** Realistic fabric physics

#### Pros:
- ✅ Real-time performance (can run on web/mobile)
- ✅ Free and open-source
- ✅ Realistic cloth physics
- ✅ Can be deployed to browser (no server needed)

#### Cons:
- ❌ Requires separate pose estimation + cloth sim pipeline
- ❌ Less photorealistic than end-to-end video models
- ❌ Complex integration (3+ libraries)
- ❌ Lower visual quality for fashion (looks synthetic)

#### Fit for Baziszt: **INTERACTIVE DEMO** — Good for interactive pose-to-video try-on, but lower quality.

---

## Recommendation for Baziszt VTO

**Short-term (MVP):** Use **Pruna P-Video Animate**
- Minimal integration effort (CLI already exists)
- Fast enough for practical UX (10 seconds)
- Affordable ($0.02/sec)
- Reasonable quality for product showcase
- **Limitation:** Requires user to provide reference video for motion

**Medium-term (Scale):** Add **Mintly as an option**
- For e-commerce catalog automation
- Better product fidelity than Pruna
- Longer-term partner for high-volume catalog

**Research track:** Evaluate **Stable Diffusion + DreamPose**
- Explore offline/self-hosted option (no API cost)
- Better fabric preservation for luxury fashion
- Could enable "fabric highlight" videos (close-ups of weave/texture)

**Interactive variant (Future):** Build **pose-to-video** with MediaPipe
- Enable users to animate custom poses
- Deploy to browser (no server needed)
- Lower quality, but interactive

---

## Next Steps

1. **Integrate Pruna P-Video** into the VTO pipeline:
   - After `/api/vto` returns a result image, offer "Animate this look" button
   - User uploads or generates a reference motion video
   - Stream animation progress to user
   - Display result video alongside static image

2. **API Design:**
   ```
   POST /api/animate
   {
     "image_url": "<vto result image>",
     "reference_video_url": "<user's motion video>"
   }
   ```

3. **UX Flow:**
   - Step 1: Generate VTO result (current flow)
   - Step 2: **[NEW]** Offer "See it in motion"
   - Step 3: User uploads reference video or selects from gallery
   - Step 4: Display animated result

4. **Cost Estimation:** 
   - Pruna: $0.02/sec × 10 sec avg = **$0.20 per animated video**
   - If 10% of VTO users animate: negligible added cost

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Pruna API downtime | UX broken | Fallback to Runway Gen-3 or Mintly |
| Poor fabric preservation | Quality perception | Test with hero products first; offer Mintly for luxury line |
| User confusion (reference video required) | Low adoption | Provide pre-recorded motion library or auto-suggest poses |
| Latency (10-30 sec) | UX friction | Show progress bar; cache results by image hash |

---

## Reference: Pruna P-Video Architecture

From `pruna-video-animate` CLI:
1. Upload reference image to Pruna
2. Upload reference video to Pruna
3. Create async prediction task (p-video-animate)
4. Poll until completion (~10s)
5. Download generated MP4

**Cost per animation:** $0.10 (if 5-second video @ $0.02/sec)

---

## Conclusion

**Pruna P-Video is the sweet spot** for Baziszt VTO:
- Low cost + fast enough
- Simple integration
- Works well with fashion products
- **Only caveat:** User must provide motion reference (addressed via motion library)
