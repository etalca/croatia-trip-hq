# Deployment workflow

Croatia Trip HQ is now public with the friend group. Do not deploy directly to production for normal feature work.

## Environments

- **Production:** https://croatia.tannerbegin.com
- **Staging:** https://croatia-trip-hq-env-staging-tanners-projects-899bf962.vercel.app
- **Friendly staging domain:** https://staging.croatia.tannerbegin.com — attached in Vercel to the `staging` environment; DNS still needs `staging.croatia` CNAME → `9c2abffe66bf00bb.vercel-dns-017.com.` at the domain host before it resolves.
- **Feature previews:** Vercel preview URLs from feature branches or `vercel deploy --target=preview`.

## Rules

1. Do feature work on a feature branch or `main` locally.
2. Run the full checks before sharing anything:
   ```bash
   npm test
   cmp -s public/index.html Website/index.html
   git diff --check
   ```
3. Push/merge to `staging` for a stable friend-safe review URL.
4. Verify staging in the browser before production.
5. Do not run `vercel --prod` for routine changes.
6. Promote to production only after Tanner explicitly approves the staging result.

## Commands

Deploy a preview/staging candidate manually:

```bash
npm run deploy:staging
```

The package script for production is intentionally blocked:

```bash
npm run deploy:production
```

If Tanner approves a staging build for production, promote the verified deployment URL intentionally rather than doing a fresh direct production build.

## Safety guard

`vercel.json` uses `ignoreCommand` with `scripts/vercel-ignore-build.sh` so automatic production builds from `main` are skipped. This keeps normal pushes from changing the live friend-facing site before staging review.
