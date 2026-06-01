import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 8090;
const BFL_API = "https://api.bfl.ai/v1";
const RUNWAY_API = "https://api.dev.runwayml.com/v1";
const API_KEY = process.env.BFL_API_KEY;
const GEN3_API_KEY = process.env.GEN3_API_KEY;

if (!API_KEY) {
  console.error("ERROR: Set BFL_API_KEY in .env");
  console.error("  echo 'BFL_API_KEY=your-key' > .env");
  process.exit(1);
}

if (!GEN3_API_KEY) {
  console.warn("WARNING: GEN3_API_KEY not set in .env - animation endpoint disabled");
}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function bflRequest(endpoint, payload, attempt = 0) {
  const MAX_RETRIES = 3;
  try {
    const res = await fetch(`${BFL_API}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Key": API_KEY,
        "accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`BFL ${res.status}: ${text}`);
    }
    return res.json();
  } catch (e) {
    // Retry only on transient network errors, not on BFL 4xx/5xx
    const isNetworkErr = e.message === "fetch failed" || e.cause?.code === "ECONNRESET" || e.cause?.code === "UND_ERR_SOCKET";
    if (isNetworkErr && attempt < MAX_RETRIES) {
      const delay = (attempt + 1) * 1500;
      console.log(`  [retry] ${endpoint} attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (${e.message})`);
      await new Promise(r => setTimeout(r, delay));
      return bflRequest(endpoint, payload, attempt + 1);
    }
    throw e;
  }
}

async function bflPoll(pollingUrl, maxWait = 300) {
  const start = Date.now();
  while (Date.now() - start < maxWait * 1000) {
    const res = await fetch(pollingUrl, {
      headers: { "X-Key": API_KEY, "accept": "application/json" },
    });
    const result = await res.json();
    if (result.status === "Ready") return result;
    if (["Error", "Content Moderated", "Request Moderated", "Failed"].includes(result.status)) return result;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { status: "Timeout" };
}

async function downloadImage(imageUrl, filename) {
  const dir = join(__dirname, "results");
  await mkdir(dir, { recursive: true });
  const res = await fetch(imageUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const path = join(dir, filename);
  await writeFile(path, buf);
  return `/results/${filename}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

function jsonResponse(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

// In-memory job tracker. Jobs never expire — fine for a demo.
const jobs = new Map();

async function runJob(jobId, endpoint, payload, filenamePrefix) {
  try {
    const resp = await bflRequest(endpoint, payload);
    console.log(`[${jobId}] submitted: ${resp.id}, polling: ${resp.polling_url}`);
    const result = await bflPoll(resp.polling_url, 300);
    console.log(`[${jobId}] status: ${result.status}`);
    if (result.status === "Ready") {
      const imageUrl = result.result.sample;
      const localPath = await downloadImage(imageUrl, `${filenamePrefix}_${Date.now()}.jpg`);
      jobs.set(jobId, { status: "ready", image_url: imageUrl, local_path: localPath });
    } else {
      jobs.set(jobId, { status: "failed", detail: result });
    }
  } catch (e) {
    console.error(`[${jobId}] error:`, e.message);
    jobs.set(jobId, { status: "failed", error: e.message });
  }
}

async function handleGenerate(req, res) {
  const body = await readBody(req);
  console.log(`[generate] ${body.prompt?.slice(0, 80)}...`);
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { status: "pending" });
  runJob(jobId, "flux-2-klein-9b", {
    prompt: body.prompt,
    width: body.width || 832,
    height: body.height || 1216,
    safety_tolerance: 2,
    output_format: "jpeg",
  }, "model");
  jsonResponse(res, { ok: true, job_id: jobId });
}

async function handleVto(req, res) {
  const body = await readBody(req);
  // Both person and garment may come as a URL OR a base64 data URL
  const person = body.person_b64 || body.person_url;
  const garment = body.garment_b64 || body.garment_url;
  const isComposite = !!body.garment_b64;
  const personIsLocal = !!body.person_b64 || body.person_url?.startsWith("/");

  console.log(`[vto] person=${personIsLocal ? '<base64/local>' : body.person_url?.slice(0, 60) + '...'} garment=${isComposite ? `<composite base64, ${Math.round(garment.length/1024)}KB>` : garment?.slice(0, 60) + '...'}`);
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { status: "pending" });

  // If person_url is a /results/... local path, read it from disk as raw base64
  let personValue = person;
  if (typeof person === "string" && person.startsWith("/results/")) {
    try {
      const buf = await readFile(join(__dirname, person));
      personValue = buf.toString("base64");
    } catch (e) {
      jsonResponse(res, { ok: false, error: `local person read failed: ${e.message}` }, 400);
      return;
    }
  }

  // BFL VTO expects RAW base64 — NOT a data: URL. Strip the prefix if present.
  // Per docs: https://docs.bfl.ml/kontext/kontext_image_editing
  const stripDataPrefix = v => {
    if (typeof v !== "string") return v;
    if (v.startsWith("data:")) {
      const comma = v.indexOf(",");
      return comma >= 0 ? v.slice(comma + 1) : v;
    }
    return v;
  };

  const payload = {
    person: stripDataPrefix(personValue),
    garment: stripDataPrefix(garment),
    prompt: (body.prompt && body.prompt.trim()) || (isComposite
      ? "The person of image 1, maintaining exactly their face and pose, wearing the garments of image 2."
      : "The person of image 1, maintaining exactly their face and pose, wearing the garment of image 2."),
    output_format: "jpeg",
  };
  runJob(jobId, "flux-tools/vto-v1", payload, "vto");
  jsonResponse(res, { ok: true, job_id: jobId });
}

async function runwayRequest(endpoint, payload, attempt = 0) {
  const MAX_RETRIES = 3;
  try {
    const res = await fetch(`${RUNWAY_API}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEN3_API_KEY}`,
        "X-Runway-Version": "2024-11",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Runway ${res.status}: ${text}`);
    }
    return res.json();
  } catch (e) {
    const isNetworkErr = e.message === "fetch failed" || e.cause?.code === "ECONNRESET" || e.cause?.code === "UND_ERR_SOCKET";
    if (isNetworkErr && attempt < MAX_RETRIES) {
      console.log(`[runwayRequest] retry ${attempt + 1}/${MAX_RETRIES}...`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return runwayRequest(endpoint, payload, attempt + 1);
    }
    throw e;
  }
}

async function runwayPoll(taskId, maxAttempts = 300) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${RUNWAY_API}/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${GEN3_API_KEY}`,
          "X-Runway-Version": "2024-11",
        },
      });
      const data = await res.json();
      if (data.status === "succeeded" || data.status === "completed") {
        return data;
      }
      if (data.status === "failed") {
        throw new Error(`Task failed: ${data.error || "unknown error"}`);
      }
      console.log(`[runway/${taskId}] ${data.status}...`);
    } catch (e) {
      if (i < maxAttempts - 1) console.error(`[runway poll] error: ${e.message}, retrying...`);
      else throw e;
    }
  }
  throw new Error("Runway task polling timeout");
}

async function handleAnimateSequence(req, res) {
  if (!GEN3_API_KEY) {
    jsonResponse(res, { ok: false, error: "GEN3_API_KEY not configured" }, 503);
    return;
  }

  const body = await readBody(req);
  const imageUrl = body.image_url;

  if (!imageUrl) {
    jsonResponse(res, { ok: false, error: "image_url required" }, 400);
    return;
  }

  const animationSequence = [
    {
      name: "smile",
      duration: 5,
      prompt:
        "Close-up of model's face, wearing white shirt and leather jacket. Model smiles warmly at camera, eyes engaging, natural expression. Soft studio lighting, white background. High fashion editorial.",
    },
    {
      name: "laugh",
      duration: 5,
      prompt:
        "Close-up of model's face, wearing white shirt and leather jacket. Model laughs joyfully, head tilts slightly, genuine joy. Natural head movement, eyes crinkling. Soft studio lighting.",
    },
    {
      name: "serious",
      duration: 5,
      prompt:
        "Close-up of model's face, wearing white shirt and leather jacket. Model looks directly at camera with serious, intense expression. Sharp jawline, confident gaze. Soft studio lighting.",
    },
    {
      name: "catwalk",
      duration: 8,
      prompt:
        "Full body shot of model wearing white shirt and leather jacket, walking toward camera on white studio backdrop. Model walks confidently, shoulders back. Outfit moves naturally, fabric flows realistically.",
    },
    {
      name: "turn_arms",
      duration: 7,
      prompt:
        "Full body shot of model wearing white shirt and leather jacket. Model walks from left to right, then turns around to face camera. Raises arms slightly, showing jacket movement. Professional fashion runway lighting.",
    },
  ];

  const jobId = `anim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { status: "pending", clips: [] });

  console.log(`[animate/${jobId}] generating ${animationSequence.length} clips from ${imageUrl.slice(0, 60)}...`);

  // Generate all clips in parallel
  (async () => {
    try {
      const clipPromises = animationSequence.map((clip) =>
        runwayRequest("image_to_video", {
          model: "gen3",
          image_url: imageUrl,
          prompt: clip.prompt,
          duration: clip.duration,
          output_format: "mp4",
        })
          .then((result) => {
            console.log(`[animate/${jobId}/${clip.name}] task=${result.id}, polling...`);
            return runwayPoll(result.id).then((finalData) => ({
              ...clip,
              task_id: result.id,
              video_url: finalData.video?.url,
              status: finalData.status,
            }));
          })
          .catch((e) => {
            console.error(`[animate/${jobId}/${clip.name}] error: ${e.message}`);
            return { ...clip, status: "failed", error: e.message };
          })
      );

      const clips = await Promise.all(clipPromises);
      const allSucceeded = clips.every((c) => c.status !== "failed");

      if (allSucceeded) {
        const videoUrls = clips.map((c) => c.video_url).filter(Boolean);
        console.log(`[animate/${jobId}] ✓ all clips ready (${videoUrls.length}/${clips.length})`);
        jobs.set(jobId, {
          status: "ready",
          clips,
          video_urls: videoUrls,
          total_duration: animationSequence.reduce((s, c) => s + c.duration, 0),
        });
      } else {
        const failed = clips.filter((c) => c.status === "failed");
        console.error(`[animate/${jobId}] ✗ ${failed.length} clips failed`);
        jobs.set(jobId, { status: "failed", clips, error: `${failed.length} clips failed` });
      }
    } catch (e) {
      console.error(`[animate/${jobId}] fatal error: ${e.message}`);
      jobs.set(jobId, { status: "failed", error: e.message });
    }
  })();

  jsonResponse(res, { ok: true, job_id: jobId });
}

async function handleImageProxy(req, res) {
  const url = new URL(req.url, "http://localhost");
  const target = url.searchParams.get("url");
  if (!target) {
    res.writeHead(400);
    res.end("missing url");
    return;
  }
  try {
    const upstream = await fetch(target);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(502);
    res.end("proxy error: " + e.message);
  }
}

function handleJobStatus(req, res) {
  const url = new URL(req.url, "http://localhost");
  const jobId = url.searchParams.get("id");
  const job = jobs.get(jobId);
  if (!job) {
    jsonResponse(res, { status: "not_found" }, 404);
    return;
  }
  jsonResponse(res, { ok: job.status === "ready", ...job });
}

async function serveStatic(req, res) {
  const url = req.url === "/" ? "/index.html" : req.url;
  const filePath = join(__dirname, url);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") return handleGenerate(req, res);
  if (req.method === "POST" && req.url === "/api/vto") return handleVto(req, res);
  if (req.method === "POST" && req.url === "/api/animate-sequence") return handleAnimateSequence(req, res);
  if (req.method === "GET" && req.url.startsWith("/api/job")) return handleJobStatus(req, res);
  if (req.method === "GET" && req.url.startsWith("/api/proxy")) return handleImageProxy(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  Baziszt VTO Demo → http://localhost:${PORT}`);
  console.log(`  API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}\n`);
});
