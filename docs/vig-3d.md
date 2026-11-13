# Vig 3D (BRD-001): architecture

A beta-only experiment: Vig as a real-time 3D bust on staging web sign-in and on the iOS Welcome
screen (Debug and Beta builds). Brand rule: `../../docs/precision-identity.md`, "Exception: 3D Vig".
Backlog: [`BACKLOG.md`](BACKLOG.md) BRD-001.

## Pipeline

```
source GLB (untrusted, outside the repo)
  └─ python3 -I scripts/brand/vig_3d.py --src <glb> --out scripts/brand/out/vig-3d
       ├─ vig.glb          → cdn.norviq.org/vig/v<N>/vig.glb   (web)
       ├─ vig-poster.png   → beside vig.glb: the flat first paint (web)
       ├─ Vig.usdz         → iOS bundle (Debug/Beta only)
       ├─ vig-model.json   → beside vig.glb, and iOS bundle: framing, bounds, hash
       └─ preview/*.png    → Gate 1 renders
```

- The script is standard library only. It uses macOS `sips` to decode the texture and `xcrun
usdcat`/`usdzip` to build the USDZ, so it runs on a Mac.
- Rerun it whenever the source changes. `scripts/brand/out/` is git-ignored.
- **Untrusted input.**
  - The source is copied into a fresh private temp directory and parsed there as data.
  - The output directory must be empty or new.
  - Paths are passed as arguments, and subprocesses get argv lists, never a shell.
  - Run it with `python3 -I` from the repo, never from the asset folder.
- **What it fixes in the source:**
  - Z-up becomes Y-up, with the front turned to +Z and the pivot at the base centre.
  - Smooth normals are added.
  - The mesh is resampled from 161k to about 41k triangles. The front and back are regular height
    grids, so this is an exact grid resample, not a lossy decimator. The side walls are rebuilt.
  - The texture is cropped from the whole 1536×1024 artwork to Vig's UV box. Every texel outside the
    silhouette (alpha below 0.5) is cleared, so the artwork's invented tickers and chart never ship.
  - The cutout uses `alphaMode` MASK instead of BLEND.
  - The base, which floats below the bust, is dropped.
- **Enforced limits** (the script exits nonzero if any fails): at most 50,000 triangles, a GLB of at
  most 1.5 MB, a texture of at most 1024 px per side, and at most 3 draw calls (front, back, walls).

## Motion

- The data is canonical in `design/vig-motion.json`. iOS keeps a byte copy at
  `financeplan/Design/vig-motion.json`.
- Each client has one pure driver that turns a time and a pointer into yaw, pitch, rise and opacity.
  Neither driver imports a renderer.
  - Web: `src/lib/vig-motion.ts`
  - iOS: `Design/VigMotion.swift`
- `design/vig-motion.fixtures.json` holds inputs and expected outputs. iOS keeps a byte copy at
  `financeplanTests/vig-motion.fixtures.json`. Both test suites load it, so the clients assert the
  same numbers from the same file.
  - The file is generated, never hand-edited: `python3 -I scripts/brand/vig_motion_fixtures.py`.
  - That script is the reference arithmetic, a third implementation, so neither client defines the
    expected values.
  - Prettier ignores the file, because the generator's `--check` compares bytes.
- `scripts/check-vig-motion-drift.sh` runs in both repos. It is one-directional on purpose: if both
  CIs compared against the other repo's `main`, a motion change could never go green.
  - **Web (canonical):** fails if the fixtures are stale. When an iOS checkout is present (locally),
    it also fails if the iOS copies differ or are missing. CI has no iOS checkout, so there it checks
    the fixtures only.
  - **iOS:** fails if either copy differs from web `main`, or if either side is missing. CI fetches
    from `main` with `gh api` and the `BRAND_GUARD_TOKEN` secret (fine-grained, read-only Contents on
    norviq-web-v2). With no token and no checkout it fails rather than skips.
  - **Change a motion value:** edit the JSON on web, regenerate the fixtures, and merge web. Then copy
    both files into iOS and merge that.
- The iOS tests run in the `VigMotionTests` gating subset. The test file and the fixtures are
  excluded from the Release test build.

## Web gating and fallbacks

- **One switch.** `VIG_3D_MODEL_URL` is set in the staging `vars` in `wrangler.jsonc`. It is empty in
  production, which means off.
- **One three.js module.** `src/lib/vig3d/scene.ts` is the only module that imports `three`, which is
  pinned to an exact version. The component imports it dynamically after first paint, never during
  SSR.
- **One WebGL context per page.** A second mount gets the flat image.
- **Flat image.** It is the first paint. The canvas starts at opacity 0 and cross-fades in on
  `onFirstFrame`. The flat image stays under any of:
  - `prefers-reduced-motion`
  - Save-Data
  - no WebGL
  - a load error
- **Pausing.** Rendering pauses when the canvas is off-screen (IntersectionObserver) or the tab is
  hidden (`visibilitychange`).
- **Size budget.** `scripts/size-budget.mjs` and `size-budget.json`. Route budgets must not grow;
  only the lazy total may.
- **Future CSP.** No CSP is set today. A future one must allow `connect-src https://cdn.norviq.org`.

## iOS gating

- The Beta config defines `BETA`. All code sits behind `#if DEBUG || BETA`.
- The app's Release config sets `EXCLUDED_SOURCE_FILE_NAMES` to the view, the driver, `Vig.usdz` and
  the JSON files. This works because the project uses synchronized folder groups.
- `scripts/verify-release-no-3d.sh` builds Release and fails if the app contains a `.usdz`, a
  `vig-*.json`, or the `Vig3DView` symbol. It runs in CI.
- **The model is not in git.** `Vig.usdz`, `vig-model.json` and `vig-poster.png` are fetched into
  `financeplan/Design/` (git-ignored) by `scripts/fetch-vig-model.sh`, which pins the CDN version
  and each file's SHA-256 (`--local` copies from this repo's `scripts/brand/out/vig-3d` instead).
  The TestFlight workflow fetches before `fastlane beta` and only warns if it cannot: that build
  then shows the flat Vig. The `release-no-3d` CI job fetches first, so Release is checked with the
  files really present.
- The script's `Beta` mode is the positive check: the Beta app must contain the model, both JSON
  files and the 3D code.
- Lights: RealityKit has no hemisphere light, so the hemisphere spec becomes a sky light from
  above and a ground light from below at half intensity each. Intensity 1 is 1000 lux. The colours
  are `AppTheme.Colors` resolved for the current scheme and re-resolved when it changes.
- A drag anywhere on Welcome (`vigFollows`) tilts Vig; half the stage's width away is the full turn,
  as on the web.
- `RealityView` uses virtual camera content with a clear background. The still shows until the first
  `SceneEvents.Update`, and stays under Reduce Motion and Low Power Mode. The still is the bust's own
  `vig-poster.png`, as on the web, because the app's `VigFull` is the full-body standing pose and
  a swap from it to the bust would change pose mid-screen. Without the fetched files it is `VigFull`.
- There is no Mac or Catalyst target, so the iPad build covers "Designed for iPad" on Mac. That case
  is not separately verified.

## CDN

- `cdn.norviq.org` is a Cloudflare Worker that only serves static assets (`cdn/`). Its headers:
  - `Access-Control-Allow-Origin: *`
  - `Cache-Control: public, max-age=31536000, immutable`
  - `nosniff`
- **Every model change gets a new version path** (`/vig/v1/` becomes `/vig/v2/`), because files are
  cached as immutable.
- A deploy replaces the whole set. Keep every version that is still referenced in the deploy folder.
- `scripts/brand/vig_cdn_layout.sh <N>` lays the build out as `/vig/v<N>/` (`vig.glb`,
  `vig-model.json`, `vig-poster.png`, `Vig.usdz`) plus `_headers`, and refuses an existing version.
- Deploy by hand: `bunx wrangler deploy --config cdn/wrangler.jsonc` (see `cdn/README.md`). The
  Worker is `norviq-cdn`; the custom domain creates its own DNS record in the `norviq.org` zone.

## Model review (2026-11-13, source `norviq_lynx_revised_bust*.glb`)

**Good:**

- Valid glTF 2.0 (trimesh), with no extensions, animations or skins.
- The face, eyes, ear tufts, gold chevrons and shoulder compass match the approved artwork exactly,
  because the texture is that artwork. The front reads well up to about 25° of yaw.
- The materials are on-palette: navy, carbon and gold.

**Fixed by the script:** orientation, normals, triangle count, texture waste and its hidden invented
numbers, BLEND sorting, and the floating base.

**Needs the modeller (does not block the experiment):**

- It is a 2.5D relief: depth 0.94 against width 3.5, and the back is a smooth navy shell. Motion is
  capped well below where the back would show.
- The artwork's sunset rim light is baked into the texture. The scene therefore uses soft frontal
  light only, with no light sweep.
- **The cutout chops the ears. This blocks Gate 1 (owner, 2026-11-13: "the ears on the front look
  cut").**
  - The cause is the source mask (alpha), not the build. The mesh covers 99.7 % of the opaque art,
    and its relief heights exist only inside that mask, so the build script cannot restore what the
    mask removed.
  - Compared with the approved artwork:
    - The left ear loses its whole tuft and the upper back of the ear. The tip is cut into a concave
      curve.
    - The top of the skull between the ears is cut flat by a straight horizontal line.
    - The right ear and its tuft are sliced by straight vertical and horizontal steps.
  - The modeller must recut the mask _and_ extend the relief over the restored areas.
- Other alpha edges to clean up:
  - a grey sky wedge to the right of the chin, which is wrongly opaque
  - the right forearm, cut straight where the artwork's chart panel crossed it
  - a thin light line along the bottom edge, from the chart panel's rim
- The version with a base: the base sits 0.19 units below the bust, sits behind it, and is narrower.
  It is not used.
