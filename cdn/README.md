# cdn.norviq.org

Norviq's own address for brand media too heavy for git. Today it holds the 3D Vig for the web
(BRD-001, [docs/vig-3d.md](../docs/vig-3d.md)): `vig.glb`, with `vig-model.json` and
`vig-poster.png` beside it. The web Worker's `VIG_3D_MODEL_URL` points at the GLB (staging only).
`Vig.usdz` is for iOS: Beta builds fetch it, with `vig-model.json`, through norviq-ios
`scripts/fetch-vig-model.sh`, which pins each file's SHA-256. A new version means updating those pins.

It is a Cloudflare Worker (`norviq-cdn`) with static assets and no code. Copied in shape from
Aaru's `cdn.aaruapp.com` (`aaru/docs/brand/cdn/`, which also has the note on when to move to R2).

## Rules

- **A new cut is a new path.** `/vig/v1/…` is cached for a year as immutable, so it is never
  overwritten: the next model goes to `v2`, and `VIG_3D_MODEL_URL` changes with it.
  `vig_cdn_layout.sh` refuses to overwrite an existing version.
- **Every deploy replaces the whole set.** A file missing from `scripts/brand/out/cdn` disappears
  from the address, so keep earlier versions in that folder while anything still points at them.
- Nothing personal and nothing secret goes here. Every file is public and readable from any site.

## Deploy

```sh
# 1. Build the model (docs/vig-3d.md):
python3 -I scripts/brand/vig_3d.py --src <glb> --out scripts/brand/out/vig-3d
# 2. Lay the files out as they are served (adds _headers):
scripts/brand/vig_cdn_layout.sh 1
# 3. Deploy by hand (wrangler login on the Norviq account):
bunx wrangler deploy --config cdn/wrangler.jsonc
# 4. Check:
curl -sI https://cdn.norviq.org/vig/v1/vig.glb
```
