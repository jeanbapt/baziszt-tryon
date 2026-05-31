const products = [
  { category: 'jackets', name: 'Frichin Jacket', desc: 'jacket', img: 'https://baziszt.com/images/frichin-jacket.jpg', price: 890 },
  { category: 'jackets', name: 'Chemise Bawa', desc: 'jacket', img: 'https://baziszt.com/images/chemise-bawa.jpg', price: 745 },
  { category: 'jackets', name: 'Chemise Sweden', desc: 'jacket', img: 'https://baziszt.com/images/chemise-sweden.jpg', price: 695 },
  { category: 'jackets', name: 'Chawachi Jacket', desc: 'jacket', img: 'https://baziszt.com/images/chawachi-jacket.jpg', price: 820 },
  { category: 'shirts', name: 'Scarlet Jacket', desc: 'shirt', img: 'https://baziszt.com/images/scarlet-jacket.jpg', price: 680 },
  { category: 'shirts', name: 'Chal Jacket', desc: 'shirt', img: 'https://baziszt.com/images/chal-jacket.jpg', price: 610 },
  { category: 'shirts', name: 'Frost Jacket', desc: 'shirt', img: 'https://baziszt.com/images/frost-jacket.jpg', price: 650 },
  { category: 'shirts', name: 'Aurum Jacket', desc: 'shirt', img: 'https://baziszt.com/images/aurum-jacket.jpg', price: 785 },
  { category: 'shirts', name: 'Chemise Lan', desc: 'shirt', img: 'https://baziszt.com/images/chemise-lan.jpg', price: 575 },
  { category: 'shirts', name: 'Chemise Riot Velours', desc: 'shirt', img: 'https://baziszt.com/images/chemise-riot-velours.jpg', price: 645 },
  { category: 'shirts', name: 'Chemise Corniche Ecru', desc: 'shirt', img: 'https://baziszt.com/images/chemise-corniche-ecru.jpg', price: 625 },
  { category: 'shirts', name: 'Chemise Provence', desc: 'shirt', img: 'https://baziszt.com/images/chemise-provence.jpg', price: 720 },
];

const fittingPairs = {
  "Scarlet Jacket": "Chemise Bawa",
  "Chemise Bawa": "Frichin Jacket",
  "Chemise Sweden": "Scarlet Jacket",
  "Chawachi Jacket": "Chemise Lan",
  "Chal Jacket": "Chemise Riot Velours",
  "Frost Jacket": "Chemise Corniche Ecru",
  "Aurum Jacket": "Chemise Provence",
  "Scarlet Jacket": "Chemise Sweden",
};
const findProduct = name => products.find(p => p.name === name);

let currentModelUrl = null;
let selectedGarmentIdx = null;

const PRESETS = 'https://raw.githubusercontent.com/DealExMachina/dexm-virtual-tryon/main/results';

const presetModels = [
  { name: "The Viking",        tag: "50s / Stocky",   img: `${PRESETS}/preset_viking.jpg` },
  { name: "Slender Med.",      tag: "30s / Lean",     img: `${PRESETS}/preset_slender_med.jpg` },
  { name: "Afro Rasta",        tag: "40s / Dreads",   img: `${PRESETS}/preset_afro_rasta.jpg` },
  { name: "Distinguished",     tag: "70s / Elder",    img: `${PRESETS}/preset_old_man.jpg` },
  { name: "Everyman",          tag: "40s / Medium",   img: `${PRESETS}/preset_medium_age.jpg` },
  { name: "Young",             tag: "20s / Slim",     img: `${PRESETS}/preset_young.jpg` },
];

function renderPresets() {
  const wrap = document.getElementById('presetModels');
  wrap.innerHTML = presetModels.map((m, i) => `
    <div class="preset-card" onclick="selectPreset(${i})" data-idx="${i}" style="cursor:pointer; border-radius:8px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08); border:3px solid transparent; transition:all 0.2s; background:#fff;">
      <div style="aspect-ratio:3/4; overflow:hidden; background:var(--sand);">
        <img src="${m.img}" alt="${m.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:11px;\\'>Generating&hellip;</div>'" style="width:100%; height:100%; object-fit:cover; display:block;">
      </div>
      <div style="padding:10px 12px; text-align:center;">
        <div style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">${m.name}</div>
        ${m.tag ? `<div style="font-size:10px; color:#888; letter-spacing:0.5px;">${m.tag}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function selectPreset(idx) {
  const m = presetModels[idx];
  currentModelUrl = m.img;
  document.querySelectorAll('.preset-card').forEach((el, i) => {
    el.style.borderColor = i === idx ? 'var(--maroon)' : 'transparent';
  });
  const thumb = document.getElementById('personThumb');
  if (thumb) thumb.innerHTML = `<img src="${m.img}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover;">`;
}

function renderProducts(filter = 'all') {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);
  filtered.forEach((p) => {
    const realIdx = products.indexOf(p);
    grid.innerHTML += `
      <div class="product-card" data-index="${realIdx}" onclick="tryGarment(${realIdx})">
        <div class="product-img-wrap">
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <div class="try-on-overlay">
            <button class="try-on-btn">Try On</button>
          </div>
        </div>
        <div class="product-info">
          <h4>${p.name}</h4>
          <span class="price">${p.price} &euro;</span>
        </div>
      </div>`;
  });
}

function filterCatalog(cat, ev) {
  document.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('active'));
  (ev?.target || ev?.currentTarget || event.target).classList.add('active');
  renderProducts(cat);
}

async function pollJob(jobId, onProgress) {
  for (let i = 0; i < 240; i++) {
    await new Promise(r => setTimeout(r, 2000));
    let r;
    try {
      r = await fetch(`/api/job?id=${jobId}`);
    } catch (e) {
      continue;
    }
    const d = await r.json();
    if (d.status === 'ready') return d;
    if (d.status === 'failed') return d;
    if (onProgress) onProgress(i);
  }
  return { status: 'timeout' };
}

async function generateViking() {
  const btn = document.getElementById('generateVikingBtn');
  const status = document.getElementById('vikingStatus');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.textContent = 'Submitting to FLUX API...';

  const promptText = document.getElementById('vikingPrompt').value.trim();
  if (!promptText) {
    status.innerHTML = '<span style="color:#c00;">Enter a prompt above</span>';
    btn.disabled = false;
    btn.textContent = 'Generate a New Model';
    return;
  }

  try {
    const submitResp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        width: 832,
        height: 1216,
      }),
    });
    const { job_id } = await submitResp.json();
    status.textContent = 'Generating model... (this takes 30-60s)';

    const data = await pollJob(job_id, i => {
      status.textContent = `Generating model... ${i * 2}s elapsed`;
    });

    if (data.ok) {
      currentModelUrl = data.local_path || data.image_url;
      presetModels.unshift({ name: "Just generated", img: data.local_path });
      if (presetModels.length > 6) presetModels.pop();
      renderPresets();
      selectPreset(0);
      status.innerHTML = '<span style="color:#2a7d2a;">Model ready &mdash; now pick a garment below.</span>';
      btn.textContent = 'Generate Another';
      document.getElementById('productGrid').scrollIntoView({ behavior:'smooth', block:'start' });
    } else {
      status.innerHTML = `<span style="color:#c00;">Failed: ${data.detail?.status || data.error || data.status}</span>`;
      btn.textContent = 'Retry';
    }
  } catch (e) {
    status.innerHTML = `<span style="color:#c00;">Server error: ${e.message}</span>`;
    btn.textContent = 'Retry';
  }
  btn.disabled = false;
}

async function tryGarment(idx) {
  if (!currentModelUrl) {
    const status = document.getElementById('vikingStatus') || document.getElementById('vtoStatus');
    if (status) status.innerHTML = '<span style="color:#c00;">Pick a model first (Step 1 above)</span>';
    document.getElementById('step1').scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }
  selectedGarmentIdx = idx;
  const p = products[idx];

  document.getElementById('garmentSlot').innerHTML = `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
  document.getElementById('resultSlot').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;">
      <div class="spinner"></div>
      <div style="font-size:13px;color:#888;">Generating ${p.name}...</div>
    </div>`;
  document.getElementById('resultBadge').style.display = 'inline-block';

  const vtoStatus = document.getElementById('vtoStatus');
  vtoStatus.textContent = `Submitting ${p.name} try-on...`;

  document.getElementById('pairingPanel')?.remove();

  try {
    const submitResp = await fetch('/api/vto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_url: currentModelUrl,
        garment_url: p.img,
        prompt: `The person of image 1, maintaining exactly their face and pose, wearing the ${p.desc} of image 2.`,
      }),
    });
    const { job_id } = await submitResp.json();

    const data = await pollJob(job_id, i => {
      vtoStatus.textContent = `Generating ${p.name}... ${i * 2}s elapsed`;
    });

    if (data.ok) {
      document.getElementById('resultSlot').innerHTML = `<img src="${data.local_path}" alt="Try-on result" style="width:100%; height:auto; object-fit:contain; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">`;
      vtoStatus.innerHTML = `<span style="color:#2a7d2a;">&#10003; Wearing <strong>${p.name}</strong></span>`;
      showPairingSuggestion(p, data.local_path);
    } else {
      document.getElementById('resultSlot').innerHTML = `
        <div class="placeholder">
          <div class="placeholder-text" style="color:#c00;">Failed: ${data.detail?.status || data.error || data.status}</div>
        </div>`;
      vtoStatus.innerHTML = `<span style="color:#c00;">Try-on failed</span>`;
    }
  } catch (e) {
    document.getElementById('resultSlot').innerHTML = `
      <div class="placeholder">
        <div class="placeholder-text" style="color:#c00;">Server error</div>
      </div>`;
    vtoStatus.innerHTML = `<span style="color:#c00;">Server error: ${e.message}</span>`;
  }
}

function showPairingSuggestion(garmentJustTried, resultImageUrl) {
  const partnerName = fittingPairs[garmentJustTried.name];
  if (!partnerName) return;
  const partner = findProduct(partnerName);
  if (!partner) return;

  window._pairingState = { base: garmentJustTried, partner, resultImageUrl };

  let panel = document.getElementById('pairingPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'pairingPanel';
    panel.style.cssText = 'margin-top:24px;padding:20px;background:var(--cream);border:1px solid var(--sand);border-radius:10px;';
    document.getElementById('vtoStatus').after(panel);
  }
  const bundlePrice = Number(garmentJustTried.price) + Number(partner.price);
  const discount = Math.round(bundlePrice * 0.10);
  const finalPrice = bundlePrice - discount;
  panel.innerHTML = `
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-weight:600;">Add one piece</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <img src="${partner.img}" alt="${partner.name}" style="width:72px;height:90px;object-fit:cover;border-radius:6px;flex-shrink:0;">
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;line-height:1.2;margin-bottom:4px;">${partner.name}</div>
        <div style="font-size:12px;color:#666;line-height:1.4;margin-bottom:10px;">The stylist's pick to complete this look.</div>
        <button class="generate-btn" onclick="addPairing()" style="padding:10px 20px;max-width:none;width:auto;font-size:11px;">+ Add the ${partner.category === 'jackets' ? 'jacket' : 'shirt'}</button>
      </div>
    </div>
    <div id="bundleBanner" style="display:none;margin-top:16px;padding:14px;background:linear-gradient(135deg, var(--maroon), #5a1a1a);color:var(--white);border-radius:8px;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;font-weight:600;text-align:center;">&#9201; Book in the next 24h &mdash; save 10%</div>
      <div style="font-size:13px;line-height:1.5;text-align:center;">
        <strong>${garmentJustTried.name}</strong> + <strong>${partner.name}</strong><br>
        <span style="text-decoration:line-through;opacity:0.5;">${bundlePrice} &euro;</span>
        &nbsp;&rarr;&nbsp;
        <span style="font-family:'Cormorant Garamond',serif;font-size:26px;">${finalPrice} &euro;</span>
        <span style="background:var(--gold);color:var(--white);font-size:9px;padding:2px 7px;border-radius:10px;letter-spacing:1px;font-weight:700;margin-left:6px;vertical-align:middle;">&minus;${discount}&nbsp;&euro;</span>
      </div>
      <div id="countdown" style="font-size:11px;text-align:center;margin-top:8px;color:var(--gold);font-family:'Cormorant Garamond',serif;letter-spacing:1px;">expires in 23:59:42</div>
      <button onclick="bookBundle()" style="display:block;width:100%;margin-top:10px;padding:10px;background:var(--gold);color:var(--white);border:none;border-radius:6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;cursor:pointer;">Book the bundle &middot; ${finalPrice} &euro;</button>
    </div>`;
  if (window._countdownTimer) clearInterval(window._countdownTimer);
}

function bookBundle() {
  const status = document.getElementById('vtoStatus');
  status.innerHTML = '<span style="color:#2a7d2a;">&#10003; Saved to your basket. Reserved for 24h.</span>';
}

function startCountdown() {
  if (window._countdownTimer) clearInterval(window._countdownTimer);
  let total = 24 * 60 * 60 - 18;
  window._countdownTimer = setInterval(() => {
    total--;
    if (total <= 0) { clearInterval(window._countdownTimer); return; }
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    const el = document.getElementById('countdown');
    if (el) el.textContent = `expires in ${h}:${m}:${s}`;
  }, 1000);
}

async function composeGarmentCanvas(urls) {
  const loadImg = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `/api/proxy?url=${encodeURIComponent(src)}`;
  });
  const list = Array.isArray(urls) ? urls : [urls];
  const imgs = await Promise.all(list.slice(0, 4).map(loadImg));

  const tileW = 512, tileH = 680;
  const canvas = document.createElement('canvas');
  canvas.width = tileW * 2;
  canvas.height = tileH * 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawFit = (img, x, y) => {
    const r = Math.min(tileW / img.width, tileH / img.height) * 0.9;
    const w = img.width * r, h = img.height * r;
    ctx.drawImage(img, x + (tileW - w) / 2, y + (tileH - h) / 2, w, h);
  };
  const slots = [[0,0], [tileW,0], [0,tileH], [tileW,tileH]];
  imgs.forEach((img, i) => drawFit(img, slots[i][0], slots[i][1]));

  return canvas.toDataURL('image/jpeg', 0.9);
}

async function addPairing() {
  const { base, partner } = window._pairingState || {};
  if (!base || !partner) return;

  document.getElementById('garmentSlot').innerHTML = `
    <div style="display:flex;gap:4px;width:100%;height:100%;">
      <img src="${base.img}" alt="${base.name}" style="width:50%;height:100%;object-fit:cover;border-radius:6px 0 0 6px;">
      <img src="${partner.img}" alt="${partner.name}" style="width:50%;height:100%;object-fit:cover;border-radius:0 6px 6px 0;">
    </div>`;
  document.getElementById('resultSlot').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;">
      <div class="spinner"></div>
      <div style="font-size:13px;color:#888;">Composing both pieces...</div>
    </div>`;
  const vtoStatus = document.getElementById('vtoStatus');
  vtoStatus.textContent = `Composing ${base.name} + ${partner.name}...`;

  try {
    const garmentComposite = await composeGarmentCanvas([base.img, partner.img]);
    const multiPrompt = `The person of image 1, maintaining exactly their face and pose, wearing the ${base.desc} and the ${partner.desc} of image 2.`;

    const submitResp = await fetch('/api/vto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_url: currentModelUrl,
        garment_b64: garmentComposite,
        prompt: multiPrompt,
      }),
    });
    const { job_id } = await submitResp.json();

    const data = await pollJob(job_id, i => {
      vtoStatus.textContent = `Composing the full look... ${i * 2}s elapsed`;
    });

    if (data.ok) {
      document.getElementById('resultSlot').innerHTML = `<img src="${data.local_path}" alt="Full look" style="width:100%;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.15);">`;
      vtoStatus.innerHTML = `<span style="color:#2a7d2a;">Full look ready!</span> <strong>${base.name}</strong> + <strong>${partner.name}</strong>.`;
      document.getElementById('bundleBanner').style.display = 'block';
      startCountdown();
    } else {
      vtoStatus.innerHTML = `<span style="color:#c00;">Failed: ${data.detail?.status || data.error || data.status}</span>`;
    }
  } catch (e) {
    vtoStatus.innerHTML = `<span style="color:#c00;">Compose error: ${e.message}</span>`;
  }
}

renderPresets();
renderProducts();
selectPreset(0);
