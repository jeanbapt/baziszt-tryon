import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 8090;
const BFL_API = "https://api.bfl.ai/v1";
const API_KEY = process.env.BFL_API_KEY;

if (!API_KEY) {
  console.error("ERROR: Set BFL_API_KEY in .env");
  console.error("  echo 'BFL_API_KEY=your-key' > .env");
  process.exit(1);
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

async function bflRequest(endpoint, payload) {
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

async function handleGenerate(req, res) {
  const body = await readBody(req);
  console.log(`[generate] ${body.prompt?.slice(0, 80)}...`);
  try {
    const resp = await bflRequest("flux-2-klein-9b", {
      prompt: body.prompt,
      width: body.width || 832,
      height: body.height || 1216,
      safety_tolerance: 2,
      output_format: "jpeg",
    });
    console.log(`[generate] submitted: ${resp.id}, polling: ${resp.polling_url}`);
    const result = await bflPoll(resp.polling_url);
    console.log(`[generate] status: ${result.status}`);
    if (result.status === "Ready") {
      const imageUrl = result.result.sample;
      const localPath = await downloadImage(imageUrl, `model_${Date.now()}.jpg`);
      jsonResponse(res, { ok: true, image_url: imageUrl, local_path: localPath, request_id: resp.id });
    } else {
      jsonResponse(res, { ok: false, status: result.status, detail: result }, 422);
    }
  } catch (e) {
    console.error(`[generate] error:`, e.message);
    jsonResponse(res, { ok: false, error: e.message }, 500);
  }
}

async function handleVto(req, res) {
  const body = await readBody(req);
  console.log(`[vto] person=${body.person_url?.slice(0, 60)}...`);
  try {
    const resp = await bflRequest("flux-kontext-max", {
      input_images: [
        { url: body.person_url },
        { url: body.garment_url },
      ],
      prompt: body.prompt,
      aspect_ratio: "3:4",
      output_format: "jpeg",
    });
    console.log(`[vto] submitted: ${resp.id}, polling: ${resp.polling_url}`);
    const result = await bflPoll(resp.polling_url, 180);
    console.log(`[vto] status: ${result.status}`);
    if (result.status === "Ready") {
      const imageUrl = result.result.sample;
      const localPath = await downloadImage(imageUrl, `vto_${Date.now()}.jpg`);
      jsonResponse(res, { ok: true, image_url: imageUrl, local_path: localPath, request_id: resp.id });
    } else {
      jsonResponse(res, { ok: false, status: result.status, detail: result }, 422);
    }
  } catch (e) {
    console.error(`[vto] error:`, e.message);
    jsonResponse(res, { ok: false, error: e.message }, 500);
  }
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
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  Baziszt VTO Demo → http://localhost:${PORT}`);
  console.log(`  API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}\n`);
});
