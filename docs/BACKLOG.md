# Backlog

Items that span repos or need an owner verdict. One section per item; newest first.

## BRD-001 Vig 3D experiment (beta only)

**Status:** in progress since 2026-11-13. Gate 1 (model review) is open.
**Owner verdict needed:** Gate 1 model renders; final go/no-go on device.
**Repos:** `norviq-web-v2` (this one, which also holds the pipeline and the canonical motion data)
and `norviq-ios/financeplan`.
**Docs:** brand exception in `../docs/precision-identity.md` ("Exception: 3D Vig") and in each repo's
`DESIGN.md`. Architecture in [`vig-3d.md`](vig-3d.md).

Vig (the lynx mascot, `vig-thinking` pose) becomes a real-time 3D bust on two signed-out screens:

- **Web:** staging sign-in, desktop brand panel.
- **iOS:** the Welcome screen in Debug and Beta (TestFlight) builds.

It copies the shape of Aaru BRD-011 (the 3D owl), with four fixes:

- web stays staging-only;
- the drift guard fails when a copy is missing;
- a script proves the Release app carries no 3D;
- the model script handles untrusted input.

**Done when:**

- [ ] The 3D Vig shows on staging web sign-in, and on TestFlight (Beta) Welcome on iPhone and iPad.
- [ ] Production web and the Release app show the flat image and carry no model. On web, no three.js
      chunk is requested when `VIG_3D_MODEL_URL` is empty. On iOS, `scripts/verify-release-no-3d.sh`
      is green in CI.
- [ ] The `/login` route budget in `size-budget.json` is unchanged. Only the lazy total grew.
- [ ] Both clients' motion tests pass against the shared `design/vig-motion.fixtures.json`, and the
      drift guard is green in both CIs.
- [ ] The owner's go/no-go is recorded here with measurements: GLB size, time to the first 3D frame,
      and fps on an older iPhone.

**Out of scope:**

- The 3D logo mark. It needs its own GLB and reuses this pipeline.
- Production or Release rollout.
- Fixing the model's alpha edges, which needs the modeller (see `vig-3d.md`, "Model review").
