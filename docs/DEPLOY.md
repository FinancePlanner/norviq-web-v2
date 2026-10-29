# Deploying norviq-web-v2 (Cloudflare Workers)

## Topology

```
browser ──▶ Cloudflare Worker "norviq-web" (SvelteKit SSR + static assets)
                 │  server-side fetch, Bearer <user token> / PUBLIC_API_TOKEN
                 │  X-Norviq-Client-IP + X-Norviq-Edge-Key
                 ▼
            https://api.norviq.org  (Traefik → Vapor today, norviq-backend-v2 per prefix)
```

The Go web ran in-cluster and called `http://api:8080`. The Worker calls the
public API hostname instead. Nothing in the API contract changes.

## Order (agreed with the backend-v2 session, 2026-10-28)

1. **Backend v2 first**, invisible to clients: it takes `api.norviq.org` path
   prefixes one domain at a time behind the same hostname, each after parity
   tests against Vapor. `/v1/auth` moves before step 3 because it carries the
   edge client-IP check (below).
2. **Web v2 reaches parity**, checked locally against staging (port-forward)
   and then on a `*.workers.dev` preview against production with an internal
   account.
3. **Cutover**: point `norviq.org` / `www.norviq.org` at the Worker (custom
   domains in `wrangler.jsonc`). The Go web stays deployed in the cluster for
   instant rollback: re-point DNS / the ingress back.

## Prerequisites before the first production deploy

| Item | Owner | Notes |
|---|---|---|
| `EDGE_CLIENT_IP_KEY` sealed into `norviq` (and `norviq-staging`) | backend-v2 | v2 trusts `X-Norviq-Client-IP` only when `X-Norviq-Edge-Key` matches. Mirror the same value into the Worker: `wrangler secret put EDGE_CLIENT_IP_KEY`. Without it login/signup rate limits see Cloudflare egress IPs. |
| `SESSION_SECRET` | web | A **new** random value (≥32 bytes). Sessions are not shared with the Go web (scs store vs sealed cookie), so cutover signs everyone out once. |
| `PUBLIC_API_TOKEN`, `REVENUECAT_WEB_API_KEY` | web | Same values as the cluster's `secrets/norviq/production/web-env.yaml`. |
| `WEBAUTHN_ORIGINS`, OAuth redirect URIs | backend (infra values) | Already `https://www.norviq.org` / `https://norviq.org`; a preview host (`*.workers.dev`) needs adding temporarily for passkey / Google / Apple sign-in to work there. |
| Staging preview | approved 2026-10-28 | See "Hosted staging preview" below. |

## Hosted staging preview

```
browser ──basic auth──▶ Worker "norviq-web-staging" (*.workers.dev, wrangler --env staging)
                           │  X-Norviq-Edge-Key
                           ▼
        api-staging.norviq.org ── Traefik forwardAuth (preview-gate) ──▶ svc/api (norviq-staging)
```

- Infra: LuminaVault/LuminaVaultInfra#483 adds the gate, ingress and the
  `edge-client-ip-key` SealedSecret in `norviq-staging` (shared with
  norviq-backend-v2 staging). Requires DNS A record
  `api-staging.norviq.org → 178.105.244.185` (Namecheap, manual).
- Worker secrets (`--env staging`): `SESSION_SECRET` (new random),
  `EDGE_CLIENT_IP_KEY` (the value sealed in #483), `PUBLIC_API_TOKEN` (staging
  web-env value), `PREVIEW_BASIC_AUTH` (`user:pass`, keeps strangers off the
  workers.dev URL).
- Deploy: `bun run build && bunx wrangler deploy --env staging`. The first
  deploy passed `--secrets-file` (JSON, kept outside the repo) so the Worker
  was never live without the basic-auth wall.
- Live since 2026-10-29: `https://norviq-web-staging.fernandocorreia316.workers.dev`
  (basic auth). LuminaVaultInfra#483 + #484 are merged and the gate passes only
  the edge key (verified in-pod: no/wrong key 401, right key 204). The TLS
  certificate for `api-staging.norviq.org` issues once the DNS A record exists;
  until then every backend call from the Worker fails.
- Smoke against it: `bun run smoke:browser scripts/smoke-pages.txt <url>` needs a
  basic-auth-aware context; locally use the dev server and the port-forward.

## Moving norviq.org DNS to Cloudflare (before cutover, as its own step)

Worker custom domains need the zone on Cloudflare. Today `norviq.org` uses
Namecheap BasicDNS (`dns1/dns2.registrar-servers.com`), so a record added in
Cloudflare has no effect until the nameservers move. Do the move a few days
before cutover so DNS and app changes never land together. Nothing changes for
users if the records are copied exactly.

Records visible from outside on 2026-10-29. This is not exhaustive: export the
zone from Namecheap → Advanced DNS and compare.

| Name | Type | Value | Cloudflare proxy |
|---|---|---|---|
| `norviq.org` | A | 178.105.244.185 | DNS only until cutover |
| `www` | A | 178.105.244.185 | DNS only until cutover |
| `api` | A | 178.105.244.185 | **DNS only, always** |
| `api-staging` | A | 178.105.244.185 | **DNS only, always** |
| `mcp` | A | 178.105.244.185 | **DNS only, always** |
| `norviq.org` | MX | 10 mx1.privateemail.com, 10 mx2.privateemail.com | n/a |
| `norviq.org` | TXT | `v=spf1 include:spf.privateemail.com ~all` | n/a |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | n/a |
| `send` | MX | 10 feedback-smtp.eu-west-1.amazonses.com | n/a |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | n/a |
| `resend._domainkey` | TXT | Resend DKIM key (copy exactly from the export) | n/a |

The cluster hosts stay "DNS only" because cert-manager issues their
certificates with HTTP-01 on the node. Proxying them would also change the
client IP the API sees.

Steps:

1. Export every record from Namecheap. Also check for anything that isn't a
   DNS record: URL redirects and email forwarding are Namecheap features that
   stop working once the nameservers move.
2. Cloudflare dashboard → Add site `norviq.org` (Free plan). Compare its
   auto-imported records with the export and fix any that are missing or wrong,
   including the proxy column above.
3. Namecheap → Domain → Nameservers → Custom DNS → the two Cloudflare
   nameservers it gives you. Wait for Cloudflare to show the zone as Active.
4. Verify: `dig +short NS norviq.org`, then each row above with
   `dig +short <name> <type> @1.1.1.1`. Send a test email to and from
   `@norviq.org`, check Resend shows the domain verified, and confirm the Go
   web, API, MCP and staging still serve with valid certificates.
5. Leave it like this. The Go web keeps serving `norviq.org` and `www`.

Rollback: switch Namecheap back to Namecheap BasicDNS. The old records are still
there as long as you don't delete them.

## Production cutover checklist

Preconditions, in order:

- [ ] Backend v2 serves `/v1/auth` in production with `EDGE_CLIENT_IP_KEY`
      sealed into namespace `norviq` (norviq-91 session). Until then, login and
      signup rate limits would see Cloudflare's egress IPs.
- [ ] Zone on Cloudflare (section above), stable for a few days.
- [ ] Staging preview checked end to end (`api-staging` certificate issued,
      login, assistant, a few writes).

Cutover:

1. Worker production secrets:
   `wrangler secret put SESSION_SECRET` (new random value),
   `PUBLIC_API_TOKEN` and `REVENUECAT_WEB_API_KEY` (from the prod `web-env`),
   `EDGE_CLIENT_IP_KEY` (the value sealed in `norviq`). Or use one
   `wrangler deploy --secrets-file` with a JSON file kept outside the repo.
2. `bun run build && bunx wrangler deploy`. It's reachable only on its
   workers.dev URL for now; smoke it there with an internal account.
3. Uncomment the custom-domain `routes` in `wrangler.jsonc` and deploy. That
   replaces the `norviq.org`/`www` A records with the Worker. Everyone is
   signed out once, because sessions aren't shared with the Go web.
4. Smoke production: landing, login, dashboard, a write, `/robots.txt`,
   `/sitemap.xml`, `/.well-known/apple-app-site-association` (universal links
   for iOS), Apple and Google sign-in, passkeys, and a RevenueCat purchase page.
5. Keep the Go web running in the cluster for at least a week.

Rollback: remove the custom-domain routes (or delete them in the dashboard) and
recreate the two A records pointing to 178.105.244.185. The Go web serves again
right away.

## Commands

```bash
bun install
bun run build                       # wrangler types --check && vite build
bunx wrangler deploy                # production Worker (vars in wrangler.jsonc)
bunx wrangler secret put SESSION_SECRET
bunx wrangler secret put PUBLIC_API_TOKEN
bunx wrangler secret put REVENUECAT_WEB_API_KEY
bunx wrangler secret put EDGE_CLIENT_IP_KEY
bunx wrangler versions upload       # preview version (preview_urls: true) without promoting
```

Local Worker runtime check (workerd) against staging:

```bash
kubectl -n norviq-staging port-forward svc/api 18080:8080   # KUBECONFIG=~/.kube/maat.yaml
bun run build
bunx wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173 \
  --var BACKEND_URL:http://localhost:18080 --var SESSION_SECRET:dev --var COOKIE_SECURE:false --var GO_ENV:development
```

## Rollback

Remove the custom-domain routes from the Worker (or re-point DNS) — the Go web
deployment in namespace `norviq` is untouched by this project and keeps
serving `norviq-web-production` from the infra repo.
