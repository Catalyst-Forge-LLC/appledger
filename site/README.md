# appledger.dev

FilePress site for [AppLedger](https://github.com/Catalyst-Forge-LLC/appledger). The home page is the short product story. `/docs` is the reading path (quickstart, standard, examples, ForgeTrail, xFacts, reference, conformance). `static/llms.txt` is an index to the specification, not a copy of it.

```bash
pnpm install
pnpm docs:build    # Markdown → docs/dist
pnpm dev           # docs build + FilePress preview
pnpm build         # → build/ (includes /docs mount)
```

Docs source: `docs/*.md` + `_nav.json`. FilePress mounts `docs/dist` at `/docs` via `paths` in `filepress.config.ts`.

LocalSlip lease: `appledger-site` on port **46002**. FilePress reads the lease. Do not pass `--port`.

`pnpm ship` builds and deploys the `build` directory to the Cloudflare Pages project `appledger`, which serves appledger.dev.
