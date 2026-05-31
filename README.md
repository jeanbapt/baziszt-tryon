# Baziszt — Virtual Try-On (local prototype)

A self-contained virtual try-on prototype for [Baziszt](https://baziszt.com): pick a model, click a garment, see the fit in seconds. Built on **Black Forest Labs [FLUX VTO](https://bfl.ai)**.

This repo is the **local all-in-one demo** (static UI + Node proxy on one port). The public, anonymized showcase lives at [dexm-virtual-tryon](https://github.com/DealExMachina/dexm-virtual-tryon).

## Live public demo

**[dealexmachina.github.io/dexm-virtual-tryon/](https://dealexmachina.github.io/dexm-virtual-tryon/)** — static UI on GitHub Pages, API on Koyeb.

## What it does

- 6 preset models and a catalog of real Baziszt garments (CDN packshots)
- Single-garment try-on via `flux-tools/vto-v1`
- Multi-garment outfits (shirt + jacket) with server-side composition
- Async job polling — generations never block the browser

## Quick start

```bash
echo 'BFL_API_KEY=your-key' > .env   # from https://docs.bfl.ai
npm start
# → http://localhost:8090
```

Requires Node 20+ (`fetch`, `--env-file`).

## API (server.js)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/generate` | Text-to-image model generation |
| POST | `/api/vto` | Virtual try-on (single or composite garment) |
| GET | `/api/job?id=…` | Poll job status |
| GET | `/api/proxy?url=…` | Same-origin image proxy for canvas composition |

## Credits

**Rendering:** [Black Forest Labs](https://bfl.ai) — FLUX Klein for model generation, FLUX VTO for garment fitting. The BFL team's VTO API and multi-garment spec made this demo possible.

**Garments:** product photography from [baziszt.com](https://baziszt.com).

All preset model images are AI-generated for demonstration. No real person is depicted without consent.

## For AI coding agents

This repo is small in *source* but heavy in *binaries*. Do **not** read `.jpg` files or log base64 payloads — a single image can consume more context than the entire codebase. See `.cursorignore`.

---

MIT · prototype 2026
