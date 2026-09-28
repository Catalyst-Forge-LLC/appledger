# appledger.dev

FilePress site for [AppLedger](https://github.com/Catalyst-Forge-LLC/appledger). Pages describe the format and the commands in this repository. `static/llms.txt` is an index to the specification, not a copy of it. The masthead is text because this site has no logo file.

```bash
pnpm install
pnpm dev
pnpm ship
```

LocalSlip lease: `appledger-site` on port **46002**. FilePress reads the lease. Do not pass `--port`.

`pnpm ship` builds and deploys the `build` directory to the Cloudflare Pages project `appledger`.
