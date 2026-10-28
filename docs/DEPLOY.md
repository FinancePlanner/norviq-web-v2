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
| Staging preview | user decision | Staging API has no public ingress (`values-staging.yaml`: `ingress.enabled: false`). A hosted staging preview needs a protected staging API host (e.g. Cloudflare Access). Until then staging = local `vite dev` + port-forward. |

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
